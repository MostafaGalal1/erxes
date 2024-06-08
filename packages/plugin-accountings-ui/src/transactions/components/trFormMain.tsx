import FormGroup from '@erxes/ui/src/components/form/Group';
import {
  FormColumn,
  FormWrapper,
  ModalFooter,
} from "@erxes/ui/src/styles/main";
import {
  __,
} from '@erxes/ui/src';
import { IQueryParams } from '@erxes/ui/src/types';
import React, { useState } from 'react';
import { ITransaction } from '../types';
import ControlLabel from '@erxes/ui/src/components/form/Label';

type Props = {
  transactions?: ITransaction[];
  queryParams: IQueryParams;
};

const TrFormMain = (props: Props) => {
  return (
    <FormWrapper>
      <FormColumn>
        <FormGroup>
          <ControlLabel required={true}>{__('MainForm')}</ControlLabel>

        </FormGroup>
      </FormColumn>
    </FormWrapper>
  );
};

export default TrFormMain;
