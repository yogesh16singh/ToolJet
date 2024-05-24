import React from 'react';
import { components } from 'react-select';
import * as Icons from '@tabler/icons-react';
import './dropdownV2.scss';

const { ValueContainer, SingleValue, Placeholder } = components;

const CustomValueContainer = ({ children, ...props }) => {
  const selectProps = props.selectProps;
  // eslint-disable-next-line import/namespace
  const IconElement = Icons[selectProps?.icon] == undefined ? Icons['IconHome2'] : Icons[selectProps?.icon];
  return (
    <ValueContainer {...props}>
      {selectProps?.doShowIcon && (
        <IconElement
          style={{
            width: '16px',
            height: '16px',
            color: selectProps?.iconColor,
          }}
        />
      )}
      <span className="d-flex" {...props}>
        {React.Children.map(children, (child) => {
          return child ? (
            child
          ) : props.hasValue ? (
            <SingleValue {...props} {...selectProps}>
              {selectProps?.getOptionLabel(props?.getValue()[0])}
            </SingleValue>
          ) : (
            <Placeholder {...props} key="placeholder" {...selectProps} data={props.getValue()}>
              {selectProps.placeholder}
            </Placeholder>
          );
        })}
      </span>
    </ValueContainer>
  );
};

export default CustomValueContainer;