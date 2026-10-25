import { Request, Response, NextFunction, RequestHandler } from "express";

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

// Express 4 ignores the promise an async handler returns, so a throw becomes an
// unhandled rejection that kills the Node process. Route every rejection to next().
export function asyncHandler<Req extends Request = Request>(
  fn: (req: Req, res: Response, next: NextFunction) => Promise<unknown>
): RequestHandler {
  return (req, res, next) => {
    fn(req as Req, res, next).catch(next);
  };
}
