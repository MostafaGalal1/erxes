import { BoardHeader } from '@erxes/ui-cards/src/settings/boards/styles';
import { ControlLabel, FormGroup } from '@erxes/ui/src';
import { IUser, UsersQueryResponse } from '@erxes/ui/src/auth/types';
import Table from '@erxes/ui/src/components/table';
import { FlexContent, FlexItem } from '@erxes/ui/src/layout/styles';
import { __ } from 'coreui/utils';
import dayjs from 'dayjs';
import React from 'react';
import { RouteComponentProps, withRouter } from 'react-router-dom';
import { IGoalType } from '../types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { runInContext } from 'vm';

interface IProps extends RouteComponentProps {
  goalType: IGoalType; // Adjust the type of goalTypes as per your
  boardName: string;
  pipelineName: string;
  stageName: string;
  usersQuery: UsersQueryResponse;
  emailName: string;
  _id: string;
  users: IUser[];
}

class GoalView extends React.Component<IProps> {
  constructor(props: IProps) {
    super(props);
  }

  render() {
    const data = this.props.goalType; // Assuming this.props contains the 'data' object
    const nestedProgressValue = data.progress.progress; // "100.000"
    const current = data.progress.current;
    const boardName = this.props.boardName;
    const pipelineName = this.props.pipelineName;
    const stageName = this.props.stageName;
    const email = this.props.emailName;
    const formattedStartDate = dayjs(data.startDate).format(
      'MM/DD/YYYY h:mm A'
    );

    const chartData = [
      {
        addMonthly: formattedStartDate,
        addTarget: data.target,
        current: data.progress.current,
        progress: data.progress.progress
      },
      ...data.specificPeriodGoals.map(result => {
        return {
          _id: result._id,
          addMonthly: result.addMonthly,
          addTarget: result.addTarget,
          progress: result.progress
        };
      })
    ];

    console.log(JSON.stringify(data, null, 2), 'data');

    return (
      <div>
        <div>
          <ControlLabel>
            {__(' Monthly: ' + data.entity + ', ' + email)}
          </ControlLabel>

          <FlexContent>
            <FlexItem>
              <BoardHeader>
                <FormGroup>
                  <ControlLabel>
                    {__('Contributor: ') + data.contribution}
                  </ControlLabel>
                  <ControlLabel>
                    {__('Goal Type: ') + data.goalType}
                  </ControlLabel>
                  <FormGroup>
                    <ControlLabel>
                      {__('Board:  ')}
                      {boardName}
                    </ControlLabel>
                    <ControlLabel>
                      {__('Pipeline:  ')}
                      {pipelineName}
                    </ControlLabel>
                    <ControlLabel>
                      {__('Stage:  ')}
                      {stageName}
                    </ControlLabel>
                  </FormGroup>
                </FormGroup>
              </BoardHeader>
            </FlexItem>
            <FlexItem>
              <FormGroup>
                <ControlLabel>
                  {__('Duration: ')} {data.startDate} - {data.endDate}
                </ControlLabel>
                <ControlLabel>{__('Current: ') + current}</ControlLabel>
                <ControlLabel>{__('Target: ') + data.target}</ControlLabel>
                <ControlLabel>
                  {__('Progress: ') + nestedProgressValue + '%'}
                </ControlLabel>
              </FormGroup>
            </FlexItem>
          </FlexContent>
        </div>
        <div>
          <ControlLabel>{__('Month ' + data.entity)}</ControlLabel>
          <FlexContent>
            <FlexItem>
              <BoardHeader>
                <FormGroup>
                  <ControlLabel>
                    {__(
                      data.entity +
                        ' progressed: ' +
                        pipelineName +
                        ', ' +
                        stageName
                    )}
                  </ControlLabel>
                </FormGroup>
              </BoardHeader>
            </FlexItem>
          </FlexContent>
        </div>

        <FlexContent>
          <FlexItem>
            <BoardHeader>
              <Table>
                <thead>
                  <tr>
                    <th>{__('Target')}</th>
                    <th>{__('Current')}</th>
                    <th> {__('progress(%)')}</th>
                    <th>{__('Month')}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.specificPeriodGoals.map((element, index) => (
                    <tr key={index}>
                      <td>{element.addTarget}</td>
                      <td>{current}</td>
                      <td>{element.progress + '%'}</td>
                      <td>{element.addMonthly}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="addMonthly" />
                  <YAxis
                    label={{
                      value: 'Number of Deals',
                      angle: -90,
                      position: 'insideLeft'
                    }}
                    padding={{ right: 10 }}
                  />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="progress" fill="#82ca9d" name="Progress" />
                </BarChart>
              </ResponsiveContainer>
            </BoardHeader>
          </FlexItem>
        </FlexContent>
      </div>
    );
  }
}

export default withRouter(GoalView);
