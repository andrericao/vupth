import styled from "styled-components/native";

export const Container = styled.View`
	margin-top: 75%;
	padding: 12px;

	flex: 1;
	flex-direction: row;
	flex-wrap: wrap;
	align-items: center;
	justify-content: center;
	gap: 24px;

	background-color: ${({ theme }) => theme.COLORS.LIGHT_BACKGROUND};
`;

export const TestText = styled.Text`
	color: ${({ theme }) => theme.COLORS.GREEN_MID};
`;