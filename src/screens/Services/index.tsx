import { Container, TestText } from './styles';

import { CardService } from '@components/CardService';

export function Services() {
  return (
    <Container>
			<CardService />
      <CardService />
      <CardService />
			<CardService />
		</Container>
  );
}