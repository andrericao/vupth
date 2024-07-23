import styled from "styled-components/native";

export const Container = styled.View`
	background-color: ${({ theme }) => theme.COLORS.LIGHT_CARDS};

	width: 45%;
	height: 200px;

	border-radius: 12px;
`;