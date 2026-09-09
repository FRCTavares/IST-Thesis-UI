/// <reference types="vite/client" />

interface IstThesisDashboardRuntimeConfig {
  mode?: string;
  apiBaseUrl?: string;
  wsUrl?: string;
  controlToken?: string;
}

interface Window {
  __IST_THESIS_DASHBOARD_CONFIG__?: IstThesisDashboardRuntimeConfig;
}
