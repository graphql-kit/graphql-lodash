import * as React from 'react';
import * as ReactDOM from 'react-dom';

import fetch from 'isomorphic-fetch';
import Modal from 'react-modal';


import {
  extendSchema,
  buildClientSchema,
  introspectionQuery,
} from 'graphql';

import { GraphiQLTab, AppConfig, TabConfig } from 'graphiql-workspace';

import 'graphiql-workspace/graphiql-workspace.css';
import 'graphiql/graphiql.css';


import { graphqlLodash, lodashDirectiveAST } from '../src/';
import { defaultQuery, savedQueries } from './queries';

// monkey patch updateSchema
// TODO:
GraphiQLTab.prototype.updateSchema = function() {
  const fetch = this.fetcher({query: introspectionQuery});

  return fetch.then(result => {
    if (result && result.data) {
      let schema = buildClientSchema(result.data);
      schema = extendSchema(schema, lodashDirectiveAST);
      this.setState({schema, schemaError: false});
    } else {
      this.setState({schemaError: true});
    }
  }).catch(_ => {
    this.setState({schemaError: true});
  });
}

const workspaceOptions = {
  defaultQuery,
  defaultSavedQueries:

  savedQueries
};

const defaultTabConfig = {
  name:'',
  url: 'https://swapi.apis.guru',
  headers: [],
  query: defaultQuery,
  maxHistory: 10,
  variables: ''
};

export class Demo extends React.Component<null, any> {
  constructor() {
    super();
    let config = new AppConfig("graphiql", workspaceOptions);

    let tab = new TabConfig('tab', defaultTabConfig);

    this.state = {
      config, tab,
      modalIsOpen: !('lodash-demo:helpModalWasClosed' in localStorage)
    }
  }

  onToolbar(action) {
    if (action == "clean") {
      this.state.appConfig.cleanup();
      this.state.config.cleanup();
      const appConfig = new AppConfig("graphiql", workspaceOptions)
      let config = new TabConfig('tab', defaultTabConfig);

      this.setState({
        appConfig,
        config,
        queryUpdate: {
          query: workspaceOptions.defaultQuery
        }
      })
    }
  }

  fetcher(graphQLParams, {url, headers}:{url: string, headers:Map<string, string>}) {
    const {query, transform} = graphqlLodash(
      graphQLParams.query,
      graphQLParams.operationName
    );

    return fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({...graphQLParams, query})
    }).then(responce => {
      if (responce.ok)
        return responce.json();
      return responce.text().then(body => {
        let err;
        try {
          err = JSON.parse(body);
        } catch(e) {
          throw body;
        }
        throw err;
      });
    }).then(result => ({
      ...result,
      data: transform(result.data)
    }))
  }

  closeModal = () => {
    this.setState({
      ...this.state,
      modalIsOpen: false,
    });

    localStorage.setItem('lodash-demo:helpModalWasClosed', 'true');
  }

  render() {
    const modalStyles = {
      overlay : {
        zIndex: '100',
        backgroundColor: 'rgba(0, 0, 0, 0.75)'
      },
      content : {
        position: 'absolute',
        top: '50%',
        left: '50%',
        right: 'auto',
        bottom: 'auto',
        width: '960px',
        maxWidth: '90%',
        height: '569px',
        overflow: 'hidden',
        border: 0,
        padding: 0,
        maxHeight: '90vh',
        transform: 'translate(-50%, -50%)'
      }
    };

    const closeButtonStyles:React.CSSProperties = {
      fontSize: '40px',
      lineHeight: '33px',
      height: '40px',
      verticalAlign: 'middle',
      width: '40px',
      textAlign: 'center',
      top: '10px',
      right: '10px',
      background: 'white',
      borderRadius: '100%',
      position: 'absolute',
      cursor: 'pointer'
    };

    return (
      <div style={{height:'100vh'}}>
        <GraphiQLTab onToolbar={this.onToolbar} fetcher={this.fetcher} app={this.state.config} tab={this.state.tab} hasClosed={false}/>
        <Modal
          contentLabel="Demo presentation iframe"
          style={modalStyles}
          isOpen={this.state.modalIsOpen}
          onRequestClose={this.closeModal}
        >
          <i style={closeButtonStyles} onClick={this.closeModal}>×</i>
          <iframe style={{maxHeight:'100%', maxWidth: '100%'}} allowFullScreen={true} frameBorder="0" width="960" height="569" src="https://docs.google.com/presentation/d/1aBXjC98hfYrbjUKlWGFMWgAMh9FcxeW_w97uatNYXls/embed?start=false&loop=false&delayms=3000" ></iframe>
        </Modal>
      </div>
    )
  }
}

ReactDOM.render(<Demo/>, document.getElementById('container'));
