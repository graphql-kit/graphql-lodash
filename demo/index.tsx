import * as React from 'react';
import * as ReactDOM from 'react-dom';
//import { buildSchema, extendSchema, parse } from 'graphql';

import GraphiQL from 'graphiql';

import fetch from 'isomorphic-fetch';

import { graphqlLodash } from '../src/';

export interface DemoState {
}

export class Demo extends React.Component<null, DemoState> {
  constructor() {
    super();
    this.state = {};
  }

  componentDidMount() {
  }

  fetcher(graphQLParams) {
    console.log(graphqlLodash());
    return fetch('http://swapi.apis.guru', {
      method: 'post',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(graphQLParams),
    }).then(response => response.json());
  }

  render() {
    return (
      <GraphiQL fetcher={this.fetcher}/>
    )
  }
}

ReactDOM.render(<Demo />, document.getElementById('container'));
