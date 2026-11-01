// log-de-falha-na-abertura (DEC-152): ponto de entrada. O Sentry sobe primeiro, depois o App; a ordem dos imports
// e a garantia (o ES module executa na ordem). Equivale ao expo/AppEntry.js, com o Sentry antes.
import "./src/boot/sentryCedo";
import registerRootComponent from "expo/src/launch/registerRootComponent";

import App from "./App";

registerRootComponent(App);
