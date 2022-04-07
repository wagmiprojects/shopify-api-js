/* global process */
import {createServer, IncomingMessage, ServerResponse} from 'http';

interface Response {
  statusCode: number;
  statusText: string;
  headers?: {[key: string]: string};
  body?: string;
}

// eslint-disable-next-line no-process-env
const port: number = parseInt(process.env.HTTP_SERVER_PORT || '3000', 10);
const errorStatusText = 'Did not work';
const requestId = 'Request id header';
const responses: {[key: string | number]: Response} = {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  200: {
    statusCode: 200,
    statusText: 'OK',
    headers: {},
    body: JSON.stringify({message: 'Your HTTP request was successful!'}),
  },
  custom: {
    statusCode: 200,
    statusText: 'OK',
    // eslint-disable-next-line @typescript-eslint/naming-convention
    headers: {'X-Not-A-Real-Header': 'some_value'},
    body: JSON.stringify({message: 'Your HTTP request was successful!'}),
  },
  lowercaseua: {
    statusCode: 200,
    statusText: 'OK',
    // eslint-disable-next-line @typescript-eslint/naming-convention
    headers: {'user-agent': 'My lowercase agent'},
    body: JSON.stringify({message: 'Your HTTP request was successful!'}),
  },
  uppercaseua: {
    statusCode: 200,
    statusText: 'OK',
    // eslint-disable-next-line @typescript-eslint/naming-convention
    headers: {'User-Agent': 'My agent'},
    body: JSON.stringify({message: 'Your HTTP request was successful!'}),
  },
  contextua: {
    statusCode: 200,
    statusText: 'OK',
    // eslint-disable-next-line @typescript-eslint/naming-convention
    headers: {'User-Agent': 'Context Agent'},
    body: JSON.stringify({message: 'Your HTTP request was successful!'}),
  },
  contextandheadersua: {
    statusCode: 200,
    statusText: 'OK',
    // eslint-disable-next-line @typescript-eslint/naming-convention
    headers: {'User-Agent': 'Headers Agent | Context Agent'},
    body: JSON.stringify({message: 'Your HTTP request was successful!'}),
  },
  deprecatedget: {
    statusCode: 200,
    statusText: 'OK',
    headers: {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      'X-Shopify-API-Deprecated-Reason':
        'This API endpoint has been deprecated',
    },
    body: JSON.stringify({message: 'Some deprecated request'}),
  },
  deprecatedpost: {
    statusCode: 200,
    statusText: 'OK',
    headers: {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      'X-Shopify-API-Deprecated-Reason':
        'This API endpoint has been deprecated',
    },
    body: JSON.stringify({
      message: 'Some deprecated post request',
      body: {
        query: 'some query',
      },
    }),
  },
  // eslint-disable-next-line @typescript-eslint/naming-convention
  403: {
    statusCode: 403,
    statusText: errorStatusText,
    // eslint-disable-next-line @typescript-eslint/naming-convention
    headers: {'x-request-id': requestId},
    body: JSON.stringify({errors: 'Something went wrong!'}),
  },
  // eslint-disable-next-line @typescript-eslint/naming-convention
  404: {
    statusCode: 404,
    statusText: errorStatusText,
    headers: {},
    body: JSON.stringify({}),
  },
  // eslint-disable-next-line @typescript-eslint/naming-convention
  429: {
    statusCode: 429,
    statusText: errorStatusText,
    // eslint-disable-next-line @typescript-eslint/naming-convention
    headers: {'x-request-id': requestId},
    body: JSON.stringify({errors: 'Something went wrong!'}),
  },
  wait: {
    statusCode: 429,
    statusText: errorStatusText,
    // eslint-disable-next-line @typescript-eslint/naming-convention
    headers: {'Retry-After': (0.05).toString()},
    body: JSON.stringify({errors: 'Something went wrong!'}),
  },
  // eslint-disable-next-line @typescript-eslint/naming-convention
  500: {
    statusCode: 500,
    statusText: errorStatusText,
    // eslint-disable-next-line @typescript-eslint/naming-convention
    headers: {'x-request-id': requestId},
    body: JSON.stringify({}),
  },
  error: {
    statusCode: 500,
    statusText: errorStatusText,
    headers: {},
    body: JSON.stringify({errors: 'Something went wrong'}),
  },
  detailederror: {
    statusCode: 500,
    statusText: errorStatusText,
    headers: {},
    body: JSON.stringify({
      errors: {title: 'Invalid title', description: 'Invalid description'},
    }),
  },
};

let retryCount = 0;

const server = createServer((req: IncomingMessage, res: ServerResponse) => {
  const lookup = req.url?.match(/^\/url\/path\/([a-z0-9]*)$/);
  const code = lookup ? lookup[1] : '200';
  let response: Response = responses[code] || responses['200'];
  if (code === 'retries' && retryCount < 2) {
    response = responses['429'];
    retryCount += 1;
  }
  if (code === 'retrythenfail') {
    if (retryCount === 0) {
      response = responses['500'];
      retryCount = 1;
    } else {
      response = responses['403'];
      // this is the end of the test, reset the counter
      retryCount = 0;
    }
  }
  if (code === 'retrythensuccess') {
    if (retryCount === 0) {
      response = responses.wait;
      retryCount = 1;
    } else {
      // this is the end of the test, reset the counter; response already defaults to success
      retryCount = 0;
    }
  }
  if (code === 'maxretries') {
    response = responses['500'];
  }
  // console.log(response);
  res.writeHead(response.statusCode, response.statusText, response.headers);
  res.end(response.body);

  // reset counters
  if (code !== 'retries' && retryCount === 2) {
    retryCount = 0;
  }

  if (code === 'endtest') {
    handle(0);
  }
});

function handle(_signal: any): void {
  process.exit(0);
}

process.on('SIGINT', handle);
process.on('SIGTERM', handle);

server.listen(port, () => {
  console.log(`Listening on :${port}`);
});