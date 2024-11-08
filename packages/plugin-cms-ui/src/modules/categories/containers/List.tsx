import { useMutation, useQuery } from '@apollo/client';
import { Spinner, router } from '@erxes/ui/src';
import { Alert, confirm } from '@erxes/ui/src/utils';
import React from 'react';
import { mutations, queries } from '../graphql';

import List from '../components/List';

type Props = {
  refetch: () => void;
  queryParams: any;
};

export default function ListContainer(props: Props) {
  console.log('categories');
  const { data, loading, refetch } = useQuery(queries.GET_CATEGORIES, {
    variables: {
      ...router.generatePaginationParams(props.queryParams || {}),
    },
    fetchPolicy: 'network-only',
  });

  const [removeMutation] = useMutation(mutations.CATEGORY_REMOVE);

  if (loading) {
    return <Spinner />;
  }

  const remove = (id: string) => {
    const message = 'Are you sure want to remove this category ?';

    confirm(message).then(() => {
      removeMutation({
        variables: { _id: id },
      })
        .then(() => {
          refetch();
          Alert.success('You successfully deleted a category.');
        })
        .catch((e) => {
          Alert.error(e.message);
        });
    });
  };

  const categories = data?.cmsCategories || [];

  const totalCount = data?.insuranceCategoryList?.totalCount || 0;

  const extendedProps = {
    ...props,
    loading,
    categories,
    totalCount,
    refetch,
    remove,
  };

  return <List {...extendedProps} />;
}
