import React from 'react';
import PropTypes from 'prop-types';
import makeStyles from '@material-ui/core/styles/makeStyles';
import { fade } from '@material-ui/core/styles/colorManipulator';

const useStyles = makeStyles(({ palette, breakpoints }) => {
  const bubbleBg = palette.shades.main;
  const bubbleFg = palette.getContrastText(bubbleBg);
  const borderImgRight = 'linear-gradient('
    + `to bottom, ${fade(bubbleFg, 0)}) 20%,`
    + `${fade(bubbleFg, 0.2)} 20% 80%,`
    + `${fade(bubbleFg, 0)} 80%`;
  const borderImgBottom = borderImgRight.replace('to bottom', 'to right');

  return {
    root: {
      display: 'flex',
      paddingRight: (props) => props.paddingRight,
      paddingLeft: (props) => props.paddingLeft,
      borderRight: ({ withBorder }) => (withBorder ? `1px solid ${fade(bubbleFg, 0.2)}` : 'none'),
      borderImageSlice: ({ withBorder }) => (withBorder ? 1 : undefined),
      borderImageSource: ({ withBorder }) => (withBorder ? borderImgRight : undefined),
      flexDirection: 'column',
      [breakpoints.down('sm')]: {
        flexDirection: 'row',
        borderRight: 'none',
        borderBottom: ({ withBorder }) => (withBorder ? `1px solid ${fade(bubbleFg, 0.2)}` : 'none'),
        borderImageSource: ({ withBorder }) => (withBorder ? borderImgBottom : undefined),
      },
    },
  };
});

/** Container for a settings button */
const ButtonContainer = ({
  children, withBorder, paddingLeft, paddingRight,
}) => {
  const classes = useStyles({ withBorder, paddingLeft, paddingRight });
  return (
    <div className={classes.root}>
      {children}
    </div>
  );
};
ButtonContainer.propTypes = {
  children: PropTypes.node.isRequired,
  withBorder: PropTypes.bool,
  paddingRight: PropTypes.number,
  paddingLeft: PropTypes.number,
};
ButtonContainer.defaultProps = {
  withBorder: false,
  paddingRight: undefined,
  paddingLeft: undefined,
};

export default ButtonContainer;
