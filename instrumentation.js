const { BasicTracerProvider, BatchSpanProcessor } = require('@opentelemetry/sdk-trace-base')
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http')

const collectorOptions = {
  url: 'tempo-grafana-tempo-distributor.monitoring.cluster.svc.local:55681', // url is optional and can be omitted - default is http://localhost:4318/v1/traces
  headers: {
    foo: 'bar'
  }, // an optional object containing custom headers to be sent with each request will only work with http
  concurrencyLimit: 10 // an optional limit on pending requests
}

const provider = new BasicTracerProvider()
const exporter = new OTLPTraceExporter(collectorOptions)
provider.addSpanProcessor(new BatchSpanProcessor(exporter, {
  // The maximum queue size. After the size is reached spans are dropped.
  maxQueueSize: 1000,
  // The interval between two consecutive exports
  scheduledDelayMillis: 30000
}))

provider.register()
