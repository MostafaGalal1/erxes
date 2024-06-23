import BoardItemCreatedLog from '../containers/BoardItemCreatedLog';
import CheckListLog from '../containers/CheckListLog';
import { IActivityLogItemProps } from '@erxes/ui-log/src/activityLogs/types';
import React from 'react';

class CreatedLog extends React.Component<IActivityLogItemProps> {
  render() {
    const { activity } = this.props;
    const { contentType } = activity;

    if (contentType === 'cards:checklist') { 
      return <CheckListLog activity={activity} />;
    }

    return <BoardItemCreatedLog activity={activity} />;
  }
}

export default CreatedLog;
