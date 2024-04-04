const { NodeSDK } = require('@opentelemetry/sdk-node')
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http')
const { OTLPMetricExporter } = require('@opentelemetry/exporter-metrics-otlp-http')
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node')
const { PeriodicExportingMetricReader } = require('@opentelemetry/sdk-metrics')

const hostName = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'tempo-distributor'

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({
    url: `${hostName}:14268/v1/traces`,
    headers: {}
  }),
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({
      url: `http://${hostName}:14268/api/v1/metrics`,
      headers: {}, // an optional object containing custom headers to be sent with each request
      concurrencyLimit: 1 // an optional limit on pending requests
    })
  }),
  instrumentations: [getNodeAutoInstrumentations()]
})

sdk.start()
