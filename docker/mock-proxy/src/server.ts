import http from 'node:http';
import * as console from 'node:console';
import express, { Request, Response, NextFunction } from 'express';
import bodyParser from 'body-parser';

import { PROXY_PORT, PROXY_NAME, ROUTES, CL_HOST, CL_PORT } from './config';
import { hubCbHeaders, dfspCbHeaders } from './utils';

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const history: Record<string, unknown>[] = [];

app.all('*', (req: Request, res: Response, next: NextFunction) => {
  const { path, method, headers, body, params, query } = req;
  const reqDetails = { path, method, headers, body, params, query }
  console.log(`[==>] [${new Date().toISOString()}] incoming request...`, reqDetails);

  if (path !== ROUTES.history) {
    history.push(reqDetails);
  }
  next();
});

app.get(ROUTES.history, (req: Request, res: Response) => {
  res.json({ history });
});
app.delete(ROUTES.history, (req: Request, res: Response) => {
  history.length = 0
  res.json({ history });
});

app.get('/health', (req: Request, res: Response) => {
  res.json({ success: true });
});

app.get('/parties/:type/:id', (req: Request, res: Response) => {
  const { type, id } = req.params;
  const headers = hubCbHeaders(req.headers);
  console.log('parties request details:', { type, id, headers, CL_HOST, CL_PORT });

  // todo: reply to CL with party info

  res
    .set(headers)
    .status(202)
    .json({ success: true });
});

app.put('/parties/:type/:id/error', (req: Request, res: Response) => {
  const { type, id } = req.params;
  const headers = dfspCbHeaders(req.headers);
  console.log('parties put error request details:', { type, id, headers, CL_HOST, CL_PORT });

  res
    .set(headers)
    .status(200)
    .json({ success: true });
});

app.get('/oracle*', (req: Request, res: Response) => {
  // console.log('oracle request details:', { type, id, headers });
  const data = {
    partyList: []
  }
  res.json({ data });
});

app.all('/echo', async (req: Request, res: Response) => {
  const input = {
    method: req.method,
    path: req.path,
    headers: req.headers,
    query: req.query,
    body: req.body,
  };
  console.log('incoming request...', input);

  res.set(hubCbHeaders).json(input);
});

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  const { message, stack, cause } = err;
  const response = { message, stack, cause };
  console.error('error response:', response);
  res.status(500).json(response);
});

const httpsServer = http.createServer(app);

httpsServer.listen(PROXY_PORT, () => {
  console.log(`Mock proxyAdapter "${PROXY_NAME}" is running on port ${PROXY_PORT}...`);
});
