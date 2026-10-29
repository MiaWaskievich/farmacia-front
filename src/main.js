// Punto de entrada de la aplicación. Crea la instancia de Vue a partir del
// componente raíz (App.vue), carga los estilos globales y la "monta" en el
// <div id="app"> del index.html.
import { createApp } from 'vue'
import './style.css'
import App from './App.vue'

createApp(App).mount('#app')
