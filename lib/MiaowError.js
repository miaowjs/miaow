function MiaowError(file, error) {
  Error.call(this);
  Error.captureStackTrace(this, MiaowError);
  this.name = 'MiaowError';
  this.error = error;
  this.message = error.message;
  this.details = error.stack;
  this.file = file;
}

module.exports = MiaowError;

MiaowError.prototype = Object.create(Error.prototype);
