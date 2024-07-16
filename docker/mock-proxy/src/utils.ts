import { IncomingHttpHeaders } from 'node:http';
import { Enum } from '@mojaloop/central-services-shared';
import { PROXY_NAME } from './config';

const { Headers} = Enum.Http

export const hubCbHeaders = (headers: IncomingHttpHeaders) => {
  const {
    [Headers.FSPIOP.SOURCE]: source,
    [Headers.FSPIOP.DESTINATION]: destination,
    host,
    'content-length': _,
    ...restHeaders
  } = headers;

  return {
    ...restHeaders,
    [Headers.FSPIOP.SOURCE]: destination,
    [Headers.FSPIOP.DESTINATION]: source,
    [Headers.FSPIOP.PROXY]: PROXY_NAME,
  };
};
