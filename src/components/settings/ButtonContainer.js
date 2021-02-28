import React from 'react';
import PropTypes from 'prop-types';
import makeStyles from '@material-ui/core/styles/makeStyles';
import { fade } from '@material-ui/core/styles/colorManipulator';

const useStyles = makeStyles(({ palette, breakpoints }) => {
  const bubbleBg = palette.shades.main;
  const bubbleFg = palette.getContrastText(bubbleBg);
  const borderImgRight =
    'linear-gradient(' +
    `to bottom, ${fade(bubbleFg, 0)} 20%, ` +
    `${fade(bubbleFg, 0.2)} 20% 80%, ` +
    `${fade(bubbleFg, 0)} 80%)`;
  const borderImgBottom = borderImgRight.replace('to bottom', 'to right');

  return {
    root: {
      display: 'flex',
      padding: ({ paddingPrev, paddingNext }) => [[0, paddingNext ?? 0, 0, paddingPrev ?? 0]],
      borderRight: ({ withBorder }) => (withBorder ? `1px solid ${fade(bubbleFg, 0.2)}` : 'none'),
      borderImageSlice: ({ withBorder }) => (withBorder ? 1 : 'unset'),
      borderImageSource: borderImgRight,
      flexDirection: 'column',
      [breakpoints.down('sm')]: {
        flexDirection: 'row',
        borderRight: (props) => 'none', // FIXME: Needs to be a func for some reason
        borderBottom: ({ withBorder }) =>
          withBorder ? `1px solid ${fade(bubbleFg, 0.2)}` : 'none',
        borderImageSource: borderImgBottom,
        padding: ({ paddingPrev, paddingNext }) => [[paddingPrev ?? 0, 0, paddingNext ?? 0, 0]],
      },
    },
  };
});

/** Container for a settings button */
const ButtonContainer = ({ children, withBorder, paddingPrev, paddingNext }) => {
  const classes = useStyles({ withBorder, paddingPrev, paddingNext });
  return <div className={classes.root}>{children}</div>;
};
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
