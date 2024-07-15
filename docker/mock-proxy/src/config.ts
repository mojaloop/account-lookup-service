import process from 'node:process';

console.log('process.env:', process.env);

export const {
  PROXY_PORT = 14200,
  PROXY_NAME = 'proxyAB',
  CL_HOST = 'localhost',
  CL_PORT = 3001,
} = process.env;

export const ROUTES = {
  history: '/history',
} as const;
