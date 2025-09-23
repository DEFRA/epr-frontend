export const uploadController = {
  options: {
    payload: {
      output: 'file',
      parse: true,
      multipart: { output: 'file' },
      maxBytes: 100 * 1024 * 1024
    }
  },
  handler: (request, h) => {
    // This handler won't be used since the form will submit directly to CDP Uploader
    return h.redirect('/')
  }
}
