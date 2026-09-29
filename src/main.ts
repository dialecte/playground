import './assets/main.css'
import App from './shell/App.vue'
import { installPlaygroundBridge } from './shell/install-playground-bridge'

import { createPinia } from 'pinia'
import { createApp } from 'vue'

const app = createApp(App)

app.use(createPinia())
installPlaygroundBridge()

app.mount('#app')
