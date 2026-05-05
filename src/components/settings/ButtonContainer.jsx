import Box from '@mui/material/Box';
import { alpha, useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import PropTypes from 'prop-types';

const borderGradient = (direction, color) =>
  `linear-gradient(${direction}, ${alpha(color, 0)} 20%, ${alpha(color, 0.2)} 20% 80%, ${alpha(color, 0)} 80%)`;

export default function ButtonContainer({ children, paddingNext, paddingPrev, withBorder }) {
  const theme = useTheme();
  const isSmallDisplay = useMediaQuery(theme.breakpoints.down('sm'));
  const bubbleBg = theme.palette?.shades?.main ?? theme.palette.background.paper;
  const bubbleFg = theme.palette.getContrastText(bubbleBg);

  return (
    <Box
      sx={{
        borderBottom: isSmallDisplay && withBorder ? `1px solid ${alpha(bubbleFg, 0.2)}` : 'none',
        borderImageSlice: withBorder ? 1 : 'unset',
        borderImageSource: borderGradient('to right', bubbleFg),
        borderRight: !isSmallDisplay && withBorder ? `1px solid ${alpha(bubbleFg, 0.2)}` : 'none',
        display: 'flex',
        flexDirection: isSmallDisplay ? 'row' : 'column',
        p: isSmallDisplay
          ? `${paddingPrev ?? 0}px 0 ${paddingNext ?? 0}px 0`
          : `0 ${paddingNext ?? 0}px 0 ${paddingPrev ?? 0}px`,
      }}
    >
      {children}
    </Box>
  );
}

ButtonContainer.propTypes = {
  children: PropTypes.node.isRequired,
  paddingNext: PropTypes.number,
  paddingPrev: PropTypes.number,
  withBorder: PropTypes.bool,
};

ButtonContainer.defaultProps = {
  paddingNext: undefined,
  paddingPrev: undefined,
  withBorder: false,
};
