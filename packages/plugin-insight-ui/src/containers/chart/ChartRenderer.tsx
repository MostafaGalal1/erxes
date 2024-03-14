import React from 'react';

import * as compose from 'lodash.flowright';
import { graphql } from '@apollo/client/react/hoc';
import { gql } from '@apollo/client';

import Spinner from '@erxes/ui/src/components/Spinner';
import { withProps } from '@erxes/ui/src/utils/core';

import ChartRenderer from '../../components/chart/ChartRenderer';
import TableRenderer from '../../components/chart/TableRenderer';
import { queries } from '../../graphql';
import {
  DEFAULT_BACKGROUND_COLORS,
  DEFAULT_BORDER_COLORS,
} from '../../components/chart/utils';

const getRandomNumbers = (num?: number) => {
  const getRandomNumber: number = Math.floor(
    Math.random() * (DEFAULT_BACKGROUND_COLORS.length - (num || 0) - 1),
  );

  if (!num) {
    return getRandomNumber;
  }

  const numbers: number[] = [];

  for (let i = 0; i < num; i++) {
    numbers.push(getRandomNumber + i);
  }

  return numbers;
};

type Props = {
  history: any;
  queryParams: any;
  chartType: string;

  chartVariables: any;
  filter?: any;
  dimension?: any;
  chartHeight?: number;
};

type FinalProps = {
  reportChartGetResultQuery: any;
} & Props;
const ChartRendererList = (props: FinalProps) => {
  const { reportChartGetResultQuery, chartVariables, filter, chartType } =
    props;

  if (reportChartGetResultQuery && reportChartGetResultQuery.loading) {
    return <Spinner />;
  }

  const getResult = reportChartGetResultQuery?.reportChartGetResult || {};

  let finalProps: any = {
    ...props,
    loading: reportChartGetResultQuery.loading,
  };

  if (getResult && Array.isArray(getResult)) {
    const randomNums = getRandomNumbers(getResult.length);

    const datasets = getResult.map((d, index) => ({
      ...d,
      backgroundColor: DEFAULT_BACKGROUND_COLORS[randomNums[index]],
      borderColor: DEFAULT_BORDER_COLORS[randomNums[index]],
      borderWidth: 1,
    }));

    finalProps = { ...finalProps, datasets };

    return <ChartRenderer {...finalProps} />;
  }

  const { data, labels, title, options } =
    reportChartGetResultQuery?.reportChartGetResult || {};

  const dataset = { data, labels, title };
  if (chartType === 'table') {
    return <TableRenderer dataset={dataset} />;
  }
  const datasets =
    !data &&
    !labels &&
    !title &&
    reportChartGetResultQuery.reportChartGetResult;

  finalProps = {
    ...props,
    options,
    datasets,
    data,
    labels,
    title,
    loading: reportChartGetResultQuery.loading,
  };

  return <ChartRenderer {...finalProps} />;
};

export default withProps<Props>(
  compose(
    graphql<any>(gql(queries.chartGetResult), {
      name: 'reportChartGetResultQuery',
      options: ({ chartVariables, filter, dimension }) => ({
        variables: {
          serviceName: chartVariables.serviceName,
          templateType: chartVariables.templateType,
          filter: { ...filter },
          dimension: { ...dimension },
        },
        fetchPolicy: 'network-only',
      }),
    }),
  )(ChartRendererList),
);
