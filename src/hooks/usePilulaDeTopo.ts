import { useCallback, useRef, useState } from "react";
import { LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent } from "react-native";

import { pilulaVisivel } from "@domain/pilulaDeTopo";

/** Liga a pilula a uma lista: passa `onScroll`/`onLayout` para ela e le `visivel`. */
export function usePilulaDeTopo() {
  const [visivel, setVisivel] = useState(false);
  const altura = useRef(0);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    altura.current = e.nativeEvent.layout.height;
  }, []);

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const agora = pilulaVisivel(e.nativeEvent.contentOffset.y, altura.current);
    // So re-renderiza quando muda — o evento de rolagem chega dezenas de vezes por segundo.
    setVisivel((antes) => (antes === agora ? antes : agora));
  }, []);

  return { visivel, onScroll, onLayout };
}
