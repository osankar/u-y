const tracesSampleRate = process.env.NODE_ENV === 'production' ? 0.1 : 1.0

export { tracesSampleRate }
