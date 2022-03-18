import { ApolloClient, ApolloLink, HttpLink, InMemoryCache } from 'apollo-boost';
import gql from 'graphql-tag';
import { isLoggedIn, getAccessToken } from "./auth";

const endpointURL = 'http://localhost:9000/graphql';

// Auth Link function
const authLink = new ApolloLink((operation, forward) => {
    if (isLoggedIn()) {
        operation.setContext({
            headers: {
                'authorization': `Bearer ${getAccessToken()}`
            }
        });
    }

    return forward(operation);
});

// Apollo Client Setup
// Apollo Link is like a middleware check the first instance and then pass to the other.
const client = new ApolloClient({
    link: ApolloLink.from([
        authLink,
        new HttpLink({uri: endpointURL})
    ]),
    cache: new InMemoryCache()
});

// async function graphqlRequest(query, variables={}) {
//     const request = {
//         method: 'POST',
//         headers: {'content-type': 'application/json'},
//         body: JSON.stringify({query, variables})
//     }

//     if (isLoggedIn()) {
//         request.headers['authorization'] = `Bearer ${getAccessToken()}`;
//     }

//     const response = await fetch(endpointURL, request);

//     const respondBody = await response.json();

//     if (respondBody.errors) {
//         const message = respondBody.errors.map((error) => error.message).join('\n');
//         throw new Error(message);
//     }

//     return respondBody.data;
// }

const jobDetailFragment = gql`
    fragment JobDetail on Job {
        id
        title
        company {
            id
            name
        }
        description
    }
`;

const jobQuery = gql`
    query JobQuery($id: ID!) {
        job(id: $id) {
            ...JobDetail
        }
    }
    ${jobDetailFragment}
    `;

const createJobMutation = gql`
    mutation CreateJob($input: CreateJobInput) {
        job: createJob(input: $input) {
            ...JobDetail
        }
    }
    ${jobDetailFragment}
    `;

const jobsQuery = gql`
    query JobsQuery {
        jobs {
            id
            title
            company {
                id
                name
            }
        }
    }`;

const companyQuery = gql`
        query CompanyQuery($id: ID!) {
            company(id: $id) {
                id
                name
                description
                jobs {
                    id
                    title
                }
            }
        }`;

export async function createJob(input) {
    const {data: {job}} = await client.mutate({
        mutation: createJobMutation, 
        variables: {input},
        update: (cache, {data}) => {
            // Save the data after create a new job in order to avoid extra requests
            cache.writeQuery({
                query: jobQuery, 
                variables: {id: data.job.id},
                data
            })
        }
    });
    return job;
}

export async function loadJobs() {
    const {data: {jobs}} = await client.query({query: jobsQuery, fetchPolicy: 'no-cache'})
    return jobs;
}

export async function loadJob(id) {
    const {data: {job}} = await client.query({query: jobQuery, variables: {id}})
    return job;
}

export async function loadCompany(id) {
    const {data: {company}} = await client.query({query: companyQuery, variables: {id}})
    return company;
}