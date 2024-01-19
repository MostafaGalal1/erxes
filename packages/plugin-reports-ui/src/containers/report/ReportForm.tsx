import { gql } from '@apollo/client';
import Spinner from '@erxes/ui/src/components/Spinner';
import React from 'react';
import { queries } from '../../graphql';
import { ReportTemplatesListQueryResponse } from '../../types';
import ReportFormComponent from '../../components/report/ReportForm';
import { useQuery } from '@apollo/client';

type Props = {
  searchValue: string;
  serviceName: string;

  history: any;
  queryParams: any;
};

const ReportForm = (props: Props) => {
  const { searchValue } = props;

  const reportTemplatesListQuery = useQuery<ReportTemplatesListQueryResponse>(
    gql(queries.reportTemplatesList),
    {
      variables: { searchValue },
      fetchPolicy: 'network-only',
    },
  );

  if (reportTemplatesListQuery.loading) {
    return <Spinner />;
  }

  const list =
    (reportTemplatesListQuery.data &&
      reportTemplatesListQuery.data.reportTemplatesList) ||
    [];

  return <ReportFormComponent {...props} reportTemplates={list} />;
};

export default ReportForm;
