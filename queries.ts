import dedent from 'dedent';

export const defaultQuery = dedent`# This is sample query with @_ directives which change the shape of response
                                   # Run this query to see the resutls!
                                   # More examples are hidden under Saved Queries dropdown above
                                   {
                                     genderStats: allPeople @_(get: "people") {
                                       people @_(countBy: "gender") {
                                         gender
                                       }
                                     }
                                   }`;

export const savedQueries = [
{
  query: dedent`# Planet With Max Population
                {
                  planetWithMaxPopulation: allPlanets @_(get: "planets") {
                    planets @_(maxBy: "population") {
                      name
                      population
                    }
                  }
                }`,
  variables: ''
},
  {
    query: dedent`# Gender Stats
                  {
                    genderStats: allPeople @_(get: "people") {
                      people @_(countBy: "gender") {
                        gender
                      }
                    }
                  }`,
  variables: ''
},
{
  query: dedent`# Map People To Films
                {
                  peopleToFilms: allPeople @_(get: "people") {
                    people @_(
                      keyBy: "name"
                      mapValues: "filmConnection.films"
                    ) {
                      name
                      filmConnection {
                        films @_(map: "title") {
                          title
                        }
                      }
                    }
                  }
                }`,
  variables: ''
}];
