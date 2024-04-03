const { BasicTracerProvider, SimpleSpanProcessor } = require('@opentelemetry/sdk-trace-base')
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-grpc')

const collectorOptions = {
  url: 'tempo-grafana-tempo-distributor.monitoring.svc.cluster.local:4317'
}

const provider = new BasicTracerProvider()
const exporter = new OTLPTraceExporter(collectorOptions)
provider.addSpanProcessor(new SimpleSpanProcessor(exporter))

const signals = ['SIGINT', 'SIGTERM']

provider.register()
signals.forEach(signal => {
  process.on(signal, () => provider.shutdown().catch(console.error))
})
