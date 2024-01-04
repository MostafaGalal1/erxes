import React, { useState } from 'react';
import ChartFormField from '../../components/chart/ChartFormField';
import SelectTeamMembers from '@erxes/ui/src/team/containers/SelectTeamMembers';
import { ControlLabel } from '@erxes/ui/src/components';
import SelectDepartments from '@erxes/ui/src/team/containers/SelectDepartments';

type IFilter = {
  [key: string]: any;
};

export type IFilterType = {
  fieldName: string;
  fieldType: string;
  fieldQuery: string;
  fieldLabel: string;
  fieldOptions: any[];
  multi?: boolean;
};

type Props = {
  filterType: IFilterType;
  setFilter: (fieldName: string, value: any) => void;
  initialValue?: any;
};

const ChartFormFieldList = (props: Props) => {
  const { filterType, setFilter, initialValue } = props;
  const {
    fieldName,
    fieldType,
    fieldQuery,
    fieldLabel,
    multi,
    fieldOptions
  } = filterType;

  const onChange = (input: any) => {
    switch (fieldType) {
      case 'select':
        const value =
          fieldQuery &&
          (fieldQuery.includes('user') || fieldQuery.includes('department'))
            ? input
            : input.value;

        setFilter(fieldName, value);

        return;
      default:
        return;
    }
  };

  return (
    <ChartFormField
      fieldType={fieldType}
      fieldQuery={fieldQuery}
      multi={multi}
      fieldOptions={fieldOptions}
      fieldLabel={fieldLabel}
      initialValue={initialValue}
      onChange={onChange}
    />
  );
};

export default ChartFormFieldList;
