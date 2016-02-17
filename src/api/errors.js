class HttpResponseError {
  constructor (status, message) {
    this.message = message
    this.status = status
  }
}

export class UnauthorizedError extends HttpResponseError {
  constructor () {
    super(401, 'Unauthorized')
  }
}

export class ResourceNotFoundError extends HttpResponseError {
  constructor () {
    super(404, 'Not Found')
  }
}

export class InternalServerError extends HttpResponseError {
  constructor () {
    super(500, 'Internal Server Error')
  }
}

export default function (app) {
  app.use((req, res, next) => {
    next(new ResourceNotFoundError())
  })

  app.use((err, req, res, next) => {
    let response = err
    if (!(response instanceof HttpResponseError)) {
      response = new InternalServerError()
    }
    if (response.status >= 500) {
      var errLog = {
        request: {
          method: req.method,
          url: req.url
        }
      }
      if (err instanceof Error) {
        errLog.error = {
          message: err.message,
          stack: err.stack
        }
      }
      console.error(errLog)
    }
    res.status(response.status)
    res.json({ message: response.message })
  })
}
