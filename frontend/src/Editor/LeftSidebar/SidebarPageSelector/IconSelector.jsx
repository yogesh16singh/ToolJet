import React, { useRef, useState } from 'react';
import { OverlayTrigger, Popover } from 'react-bootstrap';
import { VirtuosoGrid } from 'react-virtuoso';
import * as Icons from '@tabler/icons-react';
import { SearchBox } from '@/_components';

export default function IconSelector({ iconName, iconColor, updatePageIcon, pageId }) {
  const [searchText, setSearchText] = useState('');
  const [showPopOver, setPopOverVisibility] = useState(false);
  const iconList = useRef(Object.keys(Icons));
  const darkMode = localStorage.getItem('darkMode') === 'true';

  const searchIcon = (text) => {
    if (searchText === text) return;
    setSearchText(text);
  };

  const filteredIcons =
    searchText === ''
      ? iconList.current
      : iconList.current.filter((icon) => icon?.toLowerCase().includes(searchText ? searchText.toLowerCase() : ''));

  const onIconSelect = (icon) => {
    updatePageIcon(pageId, icon);
  };

  const eventPopover = () => {
    return (
      <Popover
        id="popover-basic"
        style={{ width: '460px', maxWidth: '460px' }}
        className={`icon-widget-popover ${darkMode && 'dark-theme theme-dark'}`}
      >
        <Popover.Header>
          <SearchBox onSubmit={searchIcon} width="100%" />
        </Popover.Header>
        <Popover.Body>
          <div className="row">
            {
              <VirtuosoGrid
                style={{ height: 300 }}
                totalCount={filteredIcons.length}
                listClassName="icon-list-wrapper"
                itemClassName="icon-list"
                itemContent={(index) => {
                  if (filteredIcons[index] === undefined || filteredIcons[index] === 'createReactComponent')
                    return null;
                  // eslint-disable-next-line import/namespace
                  const IconElement = Icons[filteredIcons[index]];
                  return (
                    <div
                      className="icon-element p-2"
                      onClick={() => {
                        onIconSelect(filteredIcons[index]);
                        setPopOverVisibility(false);
                      }}
                    >
                      <IconElement
                        color={`${darkMode ? '#fff' : '#000'}`}
                        stroke={1.5}
                        strokeLinejoin="miter"
                        style={{ width: '16px', height: '16px' }}
                      />
                    </div>
                  );
                }}
              />
            }
          </div>
        </Popover.Body>
      </Popover>
    );
  };

  // eslint-disable-next-line import/namespace
  const IconElement = Icons?.[iconName] ?? Icons?.['IconHome2'];

  return (
    <OverlayTrigger
      trigger="click"
      placement={'right'}
      show={showPopOver}
      onToggle={(showing) => setPopOverVisibility(showing)}
      rootClose={true}
      overlay={eventPopover()}
    >
      <div className="d-flex align-items-center" role="button">
        <div className="" style={{ marginRight: '2px' }}>
          <IconElement
            fill={`${darkMode ? '#fff' : iconColor}`}
            color={`${darkMode ? '#fff' : iconColor}`}
            style={{ width: '16px', height: '16px' }}
          />
        </div>
      </div>
    </OverlayTrigger>
  );
}