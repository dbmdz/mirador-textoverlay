import React from 'react';
import PropTypes from 'prop-types';
import { alpha, styled } from '@mui/material/styles';

const StyledButtonContainer = styled('div', {
  shouldForwardProp: (prop) =>
    prop !== 'withBorder' && prop !== 'paddingPrev' && prop !== 'paddingNext',
})(({ theme, withBorder, paddingPrev, paddingNext }) => {
  const bubbleBg = theme.palette.shades.main;
  const bubbleFg = theme.palette.getContrastText(bubbleBg);
  const borderImgRight = `linear-gradient(to bottom, ${alpha(bubbleFg, 0)} 20%, ${alpha(bubbleFg, 0.2)} 20% 80%, ${alpha(bubbleFg, 0)} 80%)`;
  const borderImgBottom = borderImgRight.replace('to bottom', 'to right');

  return {
    display: 'flex',
    padding: `0px ${paddingNext ?? 0}px 0px ${paddingPrev ?? 0}px`,
    borderRight: withBorder ? `1px solid ${alpha(bubbleFg, 0.2)}` : 'none',
    borderImageSlice: withBorder ? 1 : 'unset',
    borderImageSource: borderImgRight,
    flexDirection: 'column',
    [theme.breakpoints.down('sm')]: {
      flexDirection: 'row',
      borderRight: 'none',
      borderBottom: withBorder ? `1px solid ${alpha(bubbleFg, 0.2)}` : 'none',
      borderImageSource: borderImgBottom,
      padding: `${paddingPrev ?? 0}px 0px 0px ${paddingNext ?? 0}`
    },
  };
});

/** Container for a settings button */
const ButtonContainer = ({ children, withBorder, paddingPrev, paddingNext }) => (
  <StyledButtonContainer
    withBorder={withBorder}
    paddingPrev={paddingPrev}
    paddingNext={paddingNext}
  >
    {children}
  </StyledButtonContainer>
);

ButtonContainer.propTypes = {
  children: PropTypes.node.isRequired,
  withBorder: PropTypes.bool,
  paddingNext: PropTypes.number,
  paddingPrev: PropTypes.number,
};
ButtonContainer.defaultProps = {
  withBorder: false,
  paddingNext: undefined,
  paddingPrev: undefined,
};

export default ButtonContainer;
