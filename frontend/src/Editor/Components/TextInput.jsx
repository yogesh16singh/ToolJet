import React, { useCallback, useEffect, useRef, useState } from 'react';
import { resolveWidgetFieldValue } from '@/_helpers/utils';
import * as Icons from '@tabler/icons-react';
import Loader from '@/ToolJetUI/Loader/Loader';
const tinycolor = require('tinycolor2');
import Label from '@/_ui/Label';
import debounce from 'lodash/debounce';

export const TextInput = function TextInput({
  height,
  validate,
  properties,
  styles,
  setExposedVariable,
  setExposedVariables,
  fireEvent,
  component,
  darkMode,
  dataCy,
  isResizing,
}) {
  const textInputRef = useRef();
  const labelRef = useRef();

  const { loadingState, disabledState, label, placeholder } = properties;

  const {
    padding,
    borderRadius,
    borderColor,
    backgroundColor,
    textColor,
    boxShadow,
    width,
    alignment,
    direction,
    color,
    auto,
    errTextColor,
    iconColor,
    accentColor,
  } = styles;
  const [disable, setDisable] = useState(disabledState || loadingState);
  const [value, setValue] = useState(properties.value);
  const [visibility, setVisibility] = useState(properties.visibility);
  const { isValid, validationError } = validate(value);
  const [showValidationError, setShowValidationError] = useState(false);

  const isMandatory = resolveWidgetFieldValue(component?.definition?.validation?.mandatory?.value);
  const [labelWidth, setLabelWidth] = useState(0);
  const defaultAlignment = alignment === 'side' || alignment === 'top' ? alignment : 'side';
  const [loading, setLoading] = useState(loadingState);
  const [isFocused, setIsFocused] = useState(false);
  const _width = (width / 100) * 70; // Max width which label can go is 70% for better UX calculate width based on this value

  const computedStyles = {
    height: height == 36 ? (padding == 'default' ? '36px' : '40px') : padding == 'default' ? height : height + 4,
    borderRadius: `${borderRadius}px`,
    color: textColor !== '#1B1F24' ? textColor : disable || loading ? 'var(--text-disabled)' : 'var(--text-primary)',
    borderColor: isFocused
      ? accentColor != '4368E3'
        ? accentColor
        : 'var(--primary-accent-strong)'
      : borderColor != '#CCD1D5'
      ? borderColor
      : disable || loading
      ? '1px solid var(--borders-disabled-on-white)'
      : 'var(--borders-default)',
    '--tblr-input-border-color-darker': tinycolor(borderColor).darken(24).toString(),
    backgroundColor:
      backgroundColor != '#fff'
        ? backgroundColor
        : disable || loading
        ? darkMode
          ? 'var(--surfaces-app-bg-default)'
          : 'var(--surfaces-surface-03)'
        : 'var(--surfaces-surface-01)',
    boxShadow: boxShadow,
    padding: styles.iconVisibility
      ? height < 20
        ? '0px 10px 0px 29px'
        : '8px 10px 8px 29px'
      : height < 20
      ? '0px 10px'
      : '8px 10px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  };
  const loaderStyle = {
    right:
      direction === 'right' &&
      defaultAlignment === 'side' &&
      ((label?.length > 0 && width > 0) || (auto && width == 0 && label && label?.length != 0))
        ? `${labelWidth + 11}px`
        : '11px',
    top: `${
      defaultAlignment === 'top'
        ? ((label?.length > 0 && width > 0) || (auto && width == 0 && label && label?.length != 0)) &&
          'calc(50% + 10px)'
        : ''
    }`,
    transform:
      defaultAlignment === 'top' &&
      ((label?.length > 0 && width > 0) || (auto && width == 0 && label && label?.length != 0)) &&
      ' translateY(-50%)',
    zIndex: 3,
  };

  const debouncedOnChange = useCallback(
    debounce((value) => {
      setExposedVariable('value', value);
      fireEvent('onChange');
    }, 0),
    []
  );

  const onChange = (e) => {
    setValue(e.target.value);
    debouncedOnChange(e.target.value);
  };
  useEffect(() => {
    if (labelRef?.current) {
      const absolutewidth = labelRef?.current?.getBoundingClientRect()?.width;
      setLabelWidth(absolutewidth);
    } else setLabelWidth(0);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isResizing,
    width,
    auto,
    defaultAlignment,
    component?.definition?.styles?.iconVisibility?.value,
    label?.length,
    isMandatory,
    padding,
    direction,
    alignment,
    labelRef?.current?.getBoundingClientRect()?.width,
  ]);

  useEffect(() => {
    setExposedVariable('label', label);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [label]);

  useEffect(() => {
    disable !== disabledState && setDisable(disabledState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabledState]);

  useEffect(() => {
    visibility !== properties.visibility && setVisibility(properties.visibility);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [properties.visibility]);

  useEffect(() => {
    loading !== loadingState && setLoading(loadingState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingState]);

  useEffect(() => {
    setExposedVariable('isValid', isValid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isValid]);

  useEffect(() => {
    setValue(properties.value);
    setExposedVariable('value', properties.value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [properties.value]);

  useEffect(() => {
    const exposedVariables = {
      setFocus: async function () {
        textInputRef.current.focus();
      },
      setBlur: async function () {
        textInputRef.current.blur();
      },
      disable: async function (value) {
        setDisable(value);
      },
      visibility: async function (value) {
        setVisibility(value);
      },
    };
    setExposedVariables(exposedVariables);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const exposedVariables = {
      setText: async function (text) {
        setValue(text);
        setExposedVariable('value', text);
        fireEvent('onChange');
      },
      clear: async function () {
        setValue('');
        setExposedVariable('value', '');
        fireEvent('onChange');
      },
    };
    setExposedVariables(exposedVariables);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setValue]);
  const iconName = styles.icon; // Replace with the name of the icon you want
  // eslint-disable-next-line import/namespace
  const IconElement = Icons[iconName] == undefined ? Icons['IconHome2'] : Icons[iconName];
  // eslint-disable-next-line import/namespace

  useEffect(() => {
    setExposedVariable('isMandatory', isMandatory);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMandatory]);

  useEffect(() => {
    setExposedVariable('isLoading', loading);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  useEffect(() => {
    setExposedVariable('setLoading', async function (loading) {
      setLoading(loading);
      setExposedVariable('isLoading', loading);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [properties.loadingState]);

  useEffect(() => {
    setExposedVariable('isVisible', visibility);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibility]);

  useEffect(() => {
    setExposedVariable('setVisibility', async function (state) {
      setVisibility(state);
      setExposedVariable('isVisible', state);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [properties.visibility]);

  useEffect(() => {
    setExposedVariable('setDisable', async function (disable) {
      setDisable(disable);
      setExposedVariable('isDisabled', disable);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabledState]);

  useEffect(() => {
    setExposedVariable('isDisabled', disable);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disable]);

  return (
    <>
      <div
        data-cy={`label-${String(component.name).toLowerCase()} `}
        className={`text-input  d-flex  ${
          defaultAlignment === 'top' &&
          ((width != 0 && label?.length != 0) || (auto && width == 0 && label && label?.length != 0))
            ? 'flex-column'
            : 'align-items-center '
        }  ${direction === 'right' && defaultAlignment === 'side' ? 'flex-row-reverse' : ''}
    ${direction === 'right' && defaultAlignment === 'top' ? 'text-right' : ''}
    ${visibility || 'invisible'}`}
        style={{
          position: 'relative',
          whiteSpace: 'nowrap',
          width: '100%',
        }}
      >
        <Label
          label={label}
          width={width}
          labelRef={labelRef}
          darkMode={darkMode}
          color={color}
          defaultAlignment={defaultAlignment}
          direction={direction}
          auto={auto}
          isMandatory={isMandatory}
          _width={_width}
        />
        {component?.definition?.styles?.iconVisibility?.value && !isResizing && (
          <IconElement
            data-cy={'text-input-icon'}
            style={{
              width: '16px',
              height: '16px',
              left:
                direction === 'right'
                  ? '11px'
                  : defaultAlignment === 'top'
                  ? '11px'
                  : (label?.length > 0 && width > 0) || (auto && width == 0 && label && label?.length != 0)
                  ? `${labelWidth + 11}px`
                  : '11px', //11 ::  is 10 px inside the input + 1 px border + 12px margin right
              position: 'absolute',
              top: `${
                defaultAlignment === 'side'
                  ? '50%'
                  : (label?.length > 0 && width > 0) || (auto && width == 0 && label && label?.length != 0)
                  ? 'calc(50% + 10px)'
                  : '50%'
              }`,
              transform: ' translateY(-50%)',
              color: iconColor !== '#CFD3D859' ? iconColor : 'var(--icons-weak-disabled)',
              zIndex: 3,
            }}
            stroke={1.5}
          />
        )}
        <input
          data-cy={dataCy}
          ref={textInputRef}
          className={`tj-text-input-widget ${
            !isValid && showValidationError ? 'is-invalid' : ''
          } validation-without-icon`}
          onKeyUp={(e) => {
            if (e.key === 'Enter') {
              setValue(e.target.value);
              setExposedVariable('value', e.target.value);
              fireEvent('onEnterPressed');
            }
          }}
          onChange={onChange}
          onBlur={(e) => {
            setShowValidationError(true);
            setIsFocused(false);
            e.stopPropagation();
            fireEvent('onBlur');
            setIsFocused(false);
          }}
          onFocus={(e) => {
            setIsFocused(true);
            e.stopPropagation();

            setTimeout(() => {
              fireEvent('onFocus');
            }, 0);
          }}
          type="text"
          placeholder={placeholder}
          style={computedStyles}
          value={value}
          disabled={disable || loading}
        />
        {loading && <Loader style={{ ...loaderStyle }} width="16" />}
      </div>
      {showValidationError && visibility && (
        <div
          data-cy={`${String(component.name).toLowerCase()}-invalid-feedback`}
          style={{
            color: errTextColor,
            textAlign: direction == 'left' && 'end',
            fontSize: '11px',
            fontWeight: '400',
            lineHeight: '16px',
          }}
        >
          {showValidationError && validationError}
        </div>
      )}
    </>
  );
};
