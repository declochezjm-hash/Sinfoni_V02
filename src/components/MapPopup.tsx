import { Popup, type PopupProps } from 'react-leaflet';
import {
  MAP_AUTO_PAN_PADDING_BOTTOM_RIGHT,
  MAP_AUTO_PAN_PADDING_TOP_LEFT,
  MAP_POPUP_AUTO_PAN_PADDING,
  MAP_POPUP_OFFSET,
} from '../lib/mapLeafletConfig';

export function MapPopup({ children, offset, autoPanPadding, ...props }: PopupProps) {
  return (
    <Popup
      offset={offset ?? MAP_POPUP_OFFSET}
      autoPanPadding={autoPanPadding ?? MAP_POPUP_AUTO_PAN_PADDING}
      autoPanPaddingTopLeft={MAP_AUTO_PAN_PADDING_TOP_LEFT}
      autoPanPaddingBottomRight={MAP_AUTO_PAN_PADDING_BOTTOM_RIGHT}
      {...props}
    >
      {children}
    </Popup>
  );
}
