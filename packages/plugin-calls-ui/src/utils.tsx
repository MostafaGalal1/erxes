import {
  Actions,
  CallAction,
  CallTabContent,
  InCallFooter,
  Keypad,
} from './styles';
import { Button, FormControl, Icon } from '@erxes/ui/src/components';
import { numbers, symbols } from './constants';

import AssignBox from '@erxes/ui-inbox/src/inbox/containers/AssignBox';
import React from 'react';
import TaggerSection from '@erxes/ui-contacts/src/customers/components/common/TaggerSection';
import { __ } from '@erxes/ui/src/utils';
import { isEnabled } from '@erxes/ui/src/utils/core';

export const formatPhone = (phone) => {
  var num;
  if (phone.indexOf('@')) {
    num = phone.split('@')[0];
  } else {
    num = phone;
  }
  // remove everything but digits & '+' sign
  num = num.toString().replace(/[^+0-9]/g, '');

  return num;
};

const formatNumber = (n: number) => {
  return n.toLocaleString('en-US', {
    minimumIntegerDigits: 2,
    useGrouping: false,
  });
};

export const getSpentTime = (seconds: number) => {
  const hours = Math.floor(seconds / 3600);

  seconds -= hours * 3600;

  const minutes = Math.floor(seconds / 60);

  seconds -= minutes * 60;

  return (
    <>
      {hours !== 0 && formatNumber(hours)}
      {hours !== 0 && <span> : </span>}
      {formatNumber(minutes)}
      <span> : </span>
      {formatNumber(seconds)}
    </>
  );
};

export const renderKeyPad = (handNumPad) => {
  return (
    <Keypad>
      {numbers.map((n) => (
        <div className="number" key={n} onClick={() => handNumPad(n)}>
          {n}
        </div>
      ))}
      <div className="symbols">
        {symbols.map((s) => (
          <div
            key={s.class}
            className={s.class}
            onClick={() => handNumPad(s.symbol)}
          >
            {s.toShow || s.symbol}
          </div>
        ))}
      </div>
      <div className="number" onClick={() => handNumPad(0)}>
        0
      </div>
      <div className="symbols" onClick={() => handNumPad('delete')}>
        <Icon icon="backspace" />
      </div>
    </Keypad>
  );
};

export const renderFooter = (
  shrink,
  endCall,
  currentTab,
  onChangeText,
  sendMessage,
  customer,
  taggerRefetchQueries,
  toggleSection,
  conversationDetail,
  handNumPad,
  isKeyPad,
) => {
  if (!shrink) {
    return (
      <InCallFooter>
        <Button btnStyle="link">{__('Add or call')}</Button>
        <CallAction onClick={endCall} isDecline={true}>
          <Icon icon="phone-slash" />
        </CallAction>
        <Button btnStyle="link">{__('Transfer call')}</Button>
      </InCallFooter>
    );
  }

  return (
    <>
      <CallTabContent tab="Notes" show={currentTab === 'Notes' ? true : false}>
        <FormControl
          componentClass="textarea"
          placeholder="Send a note..."
          onChange={onChangeText}
        />
        <Button btnStyle="success" onClick={sendMessage}>
          {__('Send')}
        </Button>
      </CallTabContent>
      <CallTabContent tab="Tags" show={currentTab === 'Tags' ? true : false}>
        {isEnabled('tags') && (
          <TaggerSection
            data={customer}
            type="contacts:customer"
            refetchQueries={taggerRefetchQueries}
            collapseCallback={toggleSection}
          />
        )}
      </CallTabContent>
      <CallTabContent
        tab="Assign"
        show={currentTab === 'Assign' ? true : false}
      >
        <AssignBox
          targets={[conversationDetail]}
          event="onClick"
          afterSave={() => {}}
        />
      </CallTabContent>
      <CallTabContent
        tab="Keypad"
        show={currentTab === 'Keypad' ? true : false}
      >
        {renderKeyPad(handNumPad)}
      </CallTabContent>
      {isKeyPad && (
        <CallAction onClick={endCall} isDecline={true}>
          <Icon icon="phone-slash" />
        </CallAction>
      )}
    </>
  );
};

export const callActions = (
  isMuted,
  handleAudioToggle,
  isHolded,
  handleHold,
  endCall,
) => {
  const isHold = isHolded().localHold;

  return (
    <InCallFooter>
      <Actions>
        <div>
          <CallAction
            key={isMuted ? 'UnMute' : 'Mute'}
            shrink={isMuted ? true : false}
            onClick={handleAudioToggle}
          >
            <Icon icon={'phone-times'} />
          </CallAction>
          {isMuted ? __('Mute') : __('UnMute')}
        </div>
        <div>
          <CallAction
            key={isHold ? 'UnHold' : 'Hold'}
            shrink={isHold ? true : false}
            onClick={handleHold}
          >
            <Icon icon={'pause-1'} />
          </CallAction>
          {isHold ? __('Hold') : __('UnHold')}
        </div>
        <div>
          <CallAction>
            <Icon icon={'book-alt'} />
          </CallAction>
          {__('Detail')}
        </div>
        <div>
          <CallAction>
            <Icon icon={'phone-volume'} />
          </CallAction>
          {__('Transfer call')}
        </div>
        <CallAction onClick={endCall} isDecline={true}>
          <Icon icon="phone-slash" />
        </CallAction>
      </Actions>
    </InCallFooter>
  );
};

export const setLocalStorage = (isRegistered, isAvailable) => {
  localStorage.setItem(
    'callInfo',
    JSON.stringify({
      isRegistered,
    }),
  );

  const callConfig = JSON.parse(
    localStorage.getItem('config:call_integrations') || '{}',
  );

  callConfig &&
    localStorage.setItem(
      'config:call_integrations',
      JSON.stringify({
        inboxId: callConfig.inboxId,
        phone: callConfig.phone,
        wsServer: callConfig.wsServer,
        token: callConfig.token,
        operators: callConfig.operators,
        isAvailable,
      }),
    );
};
