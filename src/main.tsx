import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import App from './App'
import { aplicarEscala, lerEscala } from './utils/escala'

// Tamanho da interface ANTES do primeiro render — senão a tela abriria
// no tamanho errado e pularia em seguida
aplicarEscala(lerEscala())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
