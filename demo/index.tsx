import * as React from 'react';
import * as ReactDOM from 'react-dom';

import GraphiQL from 'graphiql';

import fetch from 'isomorphic-fetch';
import {
  extendSchema,
  buildClientSchema,
  introspectionQuery,
} from 'graphql';

import { graphqlLodash, lodashDirectiveAST } from '../src/';

export class Demo extends React.Component<null, null> {
  constructor() {
    super();
  }

  request(graphQLParams) {
    const {query, transform} = graphqlLodash(graphQLParams);
    return fetcher({
      ...graphQLParams,
      query,
    }).then(result => ({...result, data: transform(result.data)}));
  }

  render() {
    return (
      <GraphiQL fetcher={this.request} schema={schema}/>
    )
  }
}

const fetcher = getFetcher('http://swapi.apis.guru');
let schema;
getIntrospection(fetcher)
 .then(introspection => {
   schema = buildClientSchema(introspection.data);
   schema = extendSchema(schema, lodashDirectiveAST);
   ReactDOM.render(<Demo/>, document.getElementById('container'));
 });


function getIntrospection(fetcher) {
  return fetcher({query: introspectionQuery})
    .then(introspection => {
      if (introspection.errors)
        throw Error(JSON.stringify(introspection.errors, null, 2));
      return introspection;
    });
}

function getFetcher(url, headersObj?) {
  return (graphQLParams) => {
    return fetch(url, {
      method: 'POST',
      headers: new Headers({
        "content-type": 'application/json',
        ...headersObj,
      }),
      body: JSON.stringify(graphQLParams)
    }).then(responce => {
      if (responce.ok)
        return responce.json();
      return responce.text().then(body => {
        throw Error(`${responce.status} ${responce.statusText}\n${body}`);
      });
    })
  };
}
