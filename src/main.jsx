import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import '@fontsource/oswald/300.css';
import '@fontsource/oswald/400.css';
import '@fontsource/oswald/600.css';
import '@fontsource/montserrat/400.css';
import '@fontsource/montserrat/500.css';
import '@fontsource/montserrat/700.css';
import './index.css';
import App from './App.jsx';
import { SettingsProvider } from './settings/SettingsContext.jsx';
import { LanguageProvider } from './i18n/LanguageContext.jsx';
import { CatalogProvider } from './catalog/CatalogContext.jsx';
import { CartProvider } from './cart/CartContext.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <SettingsProvider>
        <LanguageProvider>
          <CatalogProvider>
            <CartProvider>
              <App />
            </CartProvider>
          </CatalogProvider>
        </LanguageProvider>
      </SettingsProvider>
    </BrowserRouter>
  </StrictMode>,
);
