import { useEffect } from 'react';
import { getContrastColor } from '../services/colorService';

const setColorVars = (name, color, borderOpacity = '1a') => {
  document.documentElement.style.setProperty(`--color-${name}`, color);
  document.documentElement.style.setProperty(`--color-${name}-background`, `${color}55`);
  document.documentElement.style.setProperty(`--color-${name}-border`, `${color}${borderOpacity}`);
  document.documentElement.style.setProperty(`--color-${name}-shadow`, `${color}4d`);
  document.documentElement.style.setProperty(`--color-${name}-font`, getContrastColor(color));
};

const useColorSync = (userDoc, partnerDoc, myRole) => {
  useEffect(() => {
    const userColors = userDoc?.eventTypeColors || {};
    const partnerColors = partnerDoc?.eventTypeColors || {};

    if (userColors.personal) {
      setColorVars('personal', userColors.personal, '26');
    }

    const boyfriendColor = myRole === 'boyfriend' ? userColors.boyfriend : partnerColors.boyfriend;
    if (boyfriendColor) {
      setColorVars('boyfriend', boyfriendColor);
    }

    const girlfriendColor = myRole === 'girlfriend' ? userColors.girlfriend : partnerColors.girlfriend;
    if (girlfriendColor) {
      setColorVars('girlfriend', girlfriendColor);
    }
  }, [userDoc?.eventTypeColors, partnerDoc?.eventTypeColors, myRole]);
};

export default useColorSync;
