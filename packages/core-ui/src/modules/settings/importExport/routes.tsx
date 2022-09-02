import asyncComponent from 'modules/common/components/AsyncComponent';
import queryString from 'query-string';
import React from 'react';
import { Route } from 'react-router-dom';

// const Export = asyncComponent(() =>
//   import(
//     /* webpackChunkName: "Export" */ './export/containers/ExportFormContainer'
//   )
// );

const Import = asyncComponent(() =>
  import(
    /* webpackChunkName: "Form container" */ './import/containers/FormContainer'
  )
);

const Export = asyncComponent(() =>
  import(
    /* webpackChunkName: "Form container" */ './export/containers/FormContainer'
  )
);

const Histories = asyncComponent(() =>
  import(
    /* webpackChunkName: "Settings Histories" */ './import/containers/list/Histories'
  )
);
const ExportHistories = asyncComponent(() =>
  import(
    /* webpackChunkName: "Settings Histories" */ './export/containers/ExportHistories'
  )
);
const Menu = asyncComponent(() =>
  import(
    /* webpackChunkName: "Settings Menu" */ './import/containers/SelectMenu'
  )
);

// const exportForm = ({ location }) => {
//   const queryParams = queryString.parse(location.search);
//   return <Export contentType={queryParams.type} />;
// };

const importForm = ({ location }) => {
  const queryParams = queryString.parse(location.search);

  return <Import contentType={queryParams.type} />;
};

const exportForm = ({ location }) => {
  const queryParams = queryString.parse(location.search);

  return <Export contentType={queryParams.type} />;
};

const importHistories = ({ location }) => {
  const queryParams = queryString.parse(location.search);

  return <Histories queryParams={queryParams} />;
};
const exportHistories = ({ location }) => {
  const queryParams = queryString.parse(location.search);

  return <ExportHistories queryParams={queryParams} />;
};

const selectMenu = ({ location }) => {
  const queryParams = queryString.parse(location.search);

  return <Menu queryParams={queryParams} />;
};

const routes = () => {
  return (
    <React.Fragment>
      {/* <Route
        key="/settings/export"
        path="/settings/export"
        component={exportForm}
      /> */}
      <Route
        key="/settings/import"
        path="/settings/import"
        component={importForm}
      />
      <Route
        key="/settings/export"
        path="/settings/export"
        component={exportForm}
      />

      <Route path="/settings/importHistories/" component={importHistories} />
      <Route path="/settings/selectMenu/" component={selectMenu} />
      <Route path="/settings/exportHistories" component={exportHistories} />
    </React.Fragment>
  );
};

export default routes;
