import { IUserDocument } from '@erxes/api-utils/src/types';
import { models } from './connectionResolver';
import { sendCoreMessage, sendTagsMessage } from './messageBroker';
import * as dayjs from 'dayjs';
import { PRIORITIES } from './constants';

const reportTemplates = [
  {
    serviceType: 'deal',
    title: 'Deals chart',
    serviceName: 'cards',
    description:
      '1:Closed revenue by month with deal total and closed revenue breakdown:View the revenue amount and number of deals closed each month this year so far. See which months brought in the most deal revenue. 2:Deal amount average by rep:View the average deal amounts by rep. See which reps have the highest average revenue amount on their deals. And which reps have the lowest. 3:Deal average time spent in each stage:View the average amount of time deals spend in each stage of your pipeline. See how your deals are moving through your pipeline. And where deals might be getting stuck. 4:Deal leader board - amount closed by rep:View which reps have closed the most deal revenue. See who brought in the least revenue from their deals. 5:Deal revenue by stage:View the total open revenue amounts per deal stage. 6:Deals by last modified date:View a list of deals that have most recently been updated by someone on your team. See what date they were updated and their current deal stage. 7:Deals closed lost all time by rep:View the number of deals that were closed lost by reps over all time. See who has lost the most deals. 8:Deals closed won all time by rep:View the number of deals that were closed won by rep over all time. See who has won the most deals. 9:Deals open by current stage:View the total number of deals open in each deal stage. See which deal stages have the most open deals.',
    charts: [
      'ClosedRevenueByMonthWithDealTotalAndClosedRevenueBreakdown',
      'dealsChartByMonth',
      'DealAmountAverageByRep',
      'DealLeaderboardAmountClosedByRep',
      'DealsByLastModifiedDate',
      'DealsClosedLostAllTimeByRep',
      'DealsOpenByCurrentStage',
      'DealsClosedWonAllTimeByRep',
      'DealRevenueByStage'
    ],
    img: 'https://sciter.com/wp-content/uploads/2022/08/chart-js.png'
  },
  {
    serviceType: 'task',
    title: 'Tasks chart',
    serviceName: 'cards',
    description:
      '1:Task average time to close by reps:View the average amount of time to close a task by reps. 2:Task average time to close by label:View the average amount of time to close a task by labels. 3:Task average time to close by tags:View the average amount of time to close a task by tags. 4:Task closed totals by reps:View the total number of closed tasks by reps. 5:Task closed totals by label:View the total number of closed tasks by labels. 6:Task closed totals by tags:View the total number of closed tasks by tags. 7:Tasks incomplete totals by reps:View the total number of incomplete tasks by reps. 8:Tasks incomplete totals by label:View the total number of incomplete tasks by labels. 9:Tasks incomplete totals by tags:View the total number of incomplete tasks by tags.',
    charts: [
      'TaskAverageTimeToCloseByReps',
      'TaskAverageTimeToCloseByLabel',
      'TaskAverageTimeToCloseByTags',
      'TaskClosedTotalsByReps',
      'TaskClosedTotalsByLabel',
      'TaskClosedTotalsByTags',
      'TasksIncompleteTotalsByReps',
      'TasksIncompleteTotalsByLabel',
      'TasksIncompleteTotalsByTags'
    ],
    img: 'https://cdn.mos.cms.futurecdn.net/S5bicwPe8vbP9nt3iwAwwi.jpg'
  },
  {
    serviceType: 'ticket',
    title: 'Tickets chart',
    serviceName: 'cards',
    description:
      '1:Ticket average time to close:View the average amount of time it takes for your reps to close tickets. 2:Ticket average time to close by rep:View the average amount of time it takes for a rep to close a ticket. See which reps close tickets the fastest. 3:Ticket average time to close over time:View the average amount of time it takes your reps to close tickets. See how this tracks over time. 4:View the total number of tickets closed by their assigned owner. See which reps are closing the most and least amount of tickets. 5:Ticket totals by source:View the total number of tickets coming from each source. See which channels are getting the most volume. 6:Ticket totals by status :View the total number of tickets in each part of your support queue. See how many tickets are new, closed, and more. 7:Ticket totals over time:View the total number of tickets created over a set time. See how it compares to a previous period of time. 8:Ticket totals by label/priority/tag :View the total number of tickets by label/priority/tag.  ',
    charts: [
      'TicketAverageTimeToCloseOverTime',
      'TicketClosedTotalsByRep',
      'TicketTotalsByStatus',
      'TicketTotalsByLabelPriorityTag',
      'TicketTotalsOverTime',
      'TicketAverageTimeToCloseByRep',
      'TicketAverageTimeToClose'
    ],
    img: 'https://sciter.com/wp-content/uploads/2022/08/chart-js.png'
  }
];

const chartTemplates = [
  {
    templateType: 'TasksIncompleteTotalsByTags',
    name: 'Tasks incomplete totals by tags',
    chartTypes: ['bar'],
    // Bar Chart Table
    getChartResult: async (filter: any, subdomain: string) => {
      const selectedTagIds = filter.tagIds || [];
      let tasksCount;
      try {
        if (selectedTagIds.length === 0) {
          // No selected users, so get all tasks
          tasksCount = await models?.Tasks.find({ isComplete: false }).lean();
        } else {
          // Filter tasks based on selectedLabelIds
          tasksCount = await models?.Tasks.find({
            tagIds: { $in: selectedTagIds },
            isComplete: false
          }).lean();
        }

        // Check if the returned value is not an array
        if (!Array.isArray(tasksCount)) {
          throw new Error('Invalid data: tasks is not an array.');
        }

        // Continue processing tasks...
      } catch (error) {
        console.error('Error fetching tasks:', error);

        // Handle the error or return an appropriate response.
        // For example, you might set tasks to an empty array to avoid further issues
        tasksCount = [];
      }
      const taskCounts = taskClosedByTagsRep(tasksCount);

      // Convert the counts object to an array of objects with ownerId and count
      const countsArray = Object.entries(taskCounts).map(
        ([ownerId, count]) => ({
          ownerId,
          count
        })
      );
      countsArray.sort((a, b) => b.count - a.count);

      // Extract unique ownerIds for user lookup
      const ownerIds = countsArray.map(item => item.ownerId);

      const tagInfo = await sendTagsMessage({
        subdomain,
        action: 'find',
        data: {
          _id: { $in: ownerIds || [] }
        },
        isRPC: true,
        defaultValue: []
      });

      if (!tagInfo || tagInfo.length === 0) {
        // Handle the case where no labels are found
        return {
          title: '',
          data: [],
          tagIds: [],
          count: []
        };
      }
      const enrichedTicketData = countsArray.map(item => {
        const ownerId = item.ownerId;
        const matchingLabel = tagInfo.find(
          label => label && label._id === ownerId
        );

        // Use the spread operator (...) to include all properties of the item object
        return {
          ...item,
          labels: matchingLabel ? [matchingLabel.name] : []
        };
      });
      const data = enrichedTicketData.map(t => t.count);

      // Flatten the label array and remove any empty arrays
      const label = enrichedTicketData
        .map(t => t.labels)
        .flat()
        .filter(item => item.length > 0);
      const title = 'Tasks incomplete totals by tags';

      const datasets = { title, data, labels: label };

      return datasets;
    },

    filterTypes: []
  },

  {
    templateType: 'TasksIncompleteTotalsByLabel',
    name: 'Tasks incomplete totals by label',
    chartTypes: ['bar'],
    // Bar Chart Table
    getChartResult: async (filter: any, subdomain: string) => {
      const selectedLabelIds = filter.labelIds || [];
      let tasks;
      try {
        if (selectedLabelIds.length === 0) {
          // No selected users, so get all tasks
          tasks = await models?.Tasks.find({ isComplete: false }).lean();
        } else {
          // Filter tasks based on selectedLabelIds
          tasks = await models?.Tasks.find({
            labelIds: { $in: selectedLabelIds },
            isComplete: false
          }).lean();
        }

        // Check if the returned value is not an array
        if (!Array.isArray(tasks)) {
          throw new Error('Invalid data: tasks is not an array.');
        }

        // Continue processing tasks...
      } catch (error) {
        console.error('Error fetching tasks:', error);

        // Handle the error or return an appropriate response.
        // For example, you might set tasks to an empty array to avoid further issues
        tasks = [];
      }
      const taskCounts = taskClosedByRep(tasks);

      // Convert the counts object to an array of objects with ownerId and count
      const countsArray = Object.entries(taskCounts).map(
        ([ownerId, count]) => ({
          ownerId,
          count
        })
      );
      countsArray.sort((a, b) => b.count - a.count);

      // Extract unique ownerIds for user lookup
      const ownerIds = countsArray.map(item => item.ownerId);

      const labels = await models?.PipelineLabels.find({
        _id: {
          $in: ownerIds
        }
      }).lean();

      if (!labels || labels.length === 0) {
        // Handle the case where no labels are found
        return {
          title: '',
          data: [],
          labels: [],
          count: []
        };
      }
      const enrichedTicketData = countsArray.map(item => {
        const ownerId = item.ownerId;
        const matchingLabel = labels.find(
          label => label && label._id === ownerId
        );

        // Use the spread operator (...) to include all properties of the item object
        return {
          ...item,
          labels: matchingLabel ? [matchingLabel.name] : []
        };
      });
      const data = enrichedTicketData.map(t => t.count);

      // Flatten the label array and remove any empty arrays
      const label = enrichedTicketData
        .map(t => t.labels)
        .flat()
        .filter(item => item.length > 0);
      const title = 'Tasks incomplete totals by label';

      const datasets = { title, data, labels: label };

      return datasets;
    },

    filterTypes: []
  },

  {
    templateType: 'TasksIncompleteTotalsByReps',
    name: 'Tasks incomplete totals by reps',
    chartTypes: ['bar'],
    // Bar Chart Table
    getChartResult: async (filter: any, subdomain: string) => {
      const selectedUserIds = filter.assignedUserIds || [];
      let tasks;

      try {
        if (selectedUserIds.length === 0) {
          // No selected users, so get all tasks
          tasks = await models?.Tasks.find({ isComplete: false }).lean();
        } else {
          // Filter tasks based on selectedUserIds
          tasks = await models?.Tasks.find({
            assignedUserIds: { $in: selectedUserIds },
            isComplete: false
          }).lean();
        }

        // Check if the returned value is not an array
        if (!Array.isArray(tasks)) {
          throw new Error('Invalid data: tasks is not an array.');
        }

        // Continue processing tasks...
      } catch (error) {
        console.error('Error fetching tasks:', error);

        // Handle the error or return an appropriate response.
        // For example, you might set tasks to an empty array to avoid further issues
        tasks = [];
      }

      // Calculate task counts
      const taskCounts = calculateTicketCounts(tasks);

      // Convert the counts object to an array of objects with ownerId and count
      const countsArray = Object.entries(taskCounts).map(
        // tslint:disable-next-line:no-shadowed-variable
        ([ownerId, count]) => ({
          ownerId,
          count
        })
      );

      // Sort the array based on task counts
      countsArray.sort((a, b) => b.count - a.count);

      // Extract unique ownerIds for user lookup
      const ownerIds = countsArray.map(item => item.ownerId);

      // Fetch information about assigned users
      const getTotalAssignedUsers = await sendCoreMessage({
        subdomain,
        action: 'users.find',
        data: {
          query: { _id: { $in: ownerIds } }
        },
        isRPC: true,
        defaultValue: []
      });
      // Create a map for faster user lookup
      const assignedUsersMap = getTotalAssignedUsers.reduce((acc, user) => {
        acc[user._id] = user.details; // Assuming details contains user information
        return acc;
      }, {});

      const title = 'Tasks incomplete totals by reps';
      const data = countsArray.map(item => item.count);

      const labels = Object.values(assignedUsersMap).map(
        (t: any) => t.fullName
      );

      const datasets = { title, data, labels };
      return datasets;
    },

    filterTypes: [
      {
        fieldName: 'assignedUserIds',
        fieldType: 'select',
        multi: true,
        fieldQuery: 'users',
        fieldLabel: 'Select assigned users'
      }
    ]
  },

  {
    templateType: 'TaskClosedTotalsByLabel',
    name: 'Task closed totals by label',
    chartTypes: ['bar'],
    // Bar Chart Table
    getChartResult: async (filter: any, subdomain: string) => {
      const selectedLabelIds = filter.labelIds || [];
      let tasks;
      try {
        if (selectedLabelIds.length === 0) {
          // No selected users, so get all tasks
          tasks = await models?.Tasks.find({ isComplete: true }).lean();
        } else {
          // Filter tasks based on selectedLabelIds
          tasks = await models?.Tasks.find({
            labelIds: { $in: selectedLabelIds },
            isComplete: true
          }).lean();
        }

        // Check if the returned value is not an array
        if (!Array.isArray(tasks)) {
          throw new Error('Invalid data: tasks is not an array.');
        }

        // Continue processing tasks...
      } catch (error) {
        console.error('Error fetching tasks:', error);

        // Handle the error or return an appropriate response.
        // For example, you might set tasks to an empty array to avoid further issues
        tasks = [];
      }
      const taskCounts = taskClosedByRep(tasks);

      // Convert the counts object to an array of objects with ownerId and count
      const countsArray = Object.entries(taskCounts).map(
        ([ownerId, count]) => ({
          ownerId,
          count
        })
      );
      countsArray.sort((a, b) => b.count - a.count);

      // Extract unique ownerIds for user lookup
      const ownerIds = countsArray.map(item => item.ownerId);

      const labels = await models?.PipelineLabels.find({
        _id: {
          $in: ownerIds
        }
      }).lean();

      if (!labels || labels.length === 0) {
        // Handle the case where no labels are found
        return {
          title: '',
          data: [],
          labels: [],
          count: []
        };
      }
      const enrichedTicketData = countsArray.map(item => {
        const ownerId = item.ownerId;
        const matchingLabel = labels.find(
          label => label && label._id === ownerId
        );

        // Use the spread operator (...) to include all properties of the item object
        return {
          ...item,
          labels: matchingLabel ? [matchingLabel.name] : []
        };
      });
      const data = enrichedTicketData.map(t => t.count);

      // Flatten the label array and remove any empty arrays
      const label = enrichedTicketData
        .map(t => t.labels)
        .flat()
        .filter(item => item.length > 0);
      const title = 'Task closed totals by label';

      const datasets = { title, data, labels: label };

      return datasets;
    },

    filterTypes: []
  },

  {
    templateType: 'TaskClosedTotalsByTags',
    name: 'Task closed totals by tags',
    chartTypes: ['bar'],
    // Bar Chart Table
    getChartResult: async (filter: any, subdomain: string) => {
      const selectedTagIds = filter.tagIds || [];
      let tasksCount;
      //  tasksCount = await models?.Tasks.find({ isComplete: true }).lean();
      try {
        if (selectedTagIds.length === 0) {
          // No selected users, so get all tasks
          tasksCount = await models?.Tasks.find({ isComplete: true }).lean();
        } else {
          // Filter tasks based on selectedLabelIds
          tasksCount = await models?.Tasks.find({
            tagIds: { $in: selectedTagIds },
            isComplete: true
          }).lean();
        }

        // Check if the returned value is not an array
        if (!Array.isArray(tasksCount)) {
          throw new Error('Invalid data: tasks is not an array.');
        }

        // Continue processing tasks...
      } catch (error) {
        console.error('Error fetching tasks:', error);

        // Handle the error or return an appropriate response.
        // For example, you might set tasks to an empty array to avoid further issues
        tasksCount = [];
      }
      const taskCounts = taskClosedByTagsRep(tasksCount);

      // Convert the counts object to an array of objects with ownerId and count
      const countsArray = Object.entries(taskCounts).map(
        ([ownerId, count]) => ({
          ownerId,
          count
        })
      );
      countsArray.sort((a, b) => b.count - a.count);

      // Extract unique ownerIds for user lookup
      const ownerIds = countsArray.map(item => item.ownerId);

      const tagInfo = await sendTagsMessage({
        subdomain,
        action: 'find',
        data: {
          _id: { $in: ownerIds || [] }
        },
        isRPC: true,
        defaultValue: []
      });

      if (!tagInfo || tagInfo.length === 0) {
        // Handle the case where no labels are found
        return {
          title: '',
          data: [],
          tagIds: [],
          count: []
        };
      }
      const enrichedTicketData = countsArray.map(item => {
        const ownerId = item.ownerId;
        const matchingLabel = tagInfo.find(
          label => label && label._id === ownerId
        );

        // Use the spread operator (...) to include all properties of the item object
        return {
          ...item,
          labels: matchingLabel ? [matchingLabel.name] : []
        };
      });
      const data = enrichedTicketData.map(t => t.count);

      // Flatten the label array and remove any empty arrays
      const label = enrichedTicketData
        .map(t => t.labels)
        .flat()
        .filter(item => item.length > 0);
      const title = 'Task closed totals by tags';

      const datasets = { title, data, labels: label };

      return datasets;
    },

    filterTypes: []
  },
  {
    templateType: 'TaskClosedTotalsByReps',
    name: 'Task closed totals by reps',
    chartTypes: ['bar'],
    // Bar Chart Table
    getChartResult: async (filter: any, subdomain: string) => {
      const selectedUserIds = filter.assignedUserIds || [];
      let tasks;

      try {
        if (selectedUserIds.length === 0) {
          // No selected users, so get all tasks
          tasks = await models?.Tasks.find({ isComplete: true }).lean();
        } else {
          // Filter tasks based on selectedUserIds
          tasks = await models?.Tasks.find({
            assignedUserIds: { $in: selectedUserIds },
            isComplete: true
          }).lean();
        }

        // Check if the returned value is not an array
        if (!Array.isArray(tasks)) {
          throw new Error('Invalid data: tasks is not an array.');
        }

        // Continue processing tasks...
      } catch (error) {
        console.error('Error fetching tasks:', error);

        // Handle the error or return an appropriate response.
        // For example, you might set tasks to an empty array to avoid further issues
        tasks = [];
      }

      // Calculate task counts
      const taskCounts = calculateTicketCounts(tasks);

      // Convert the counts object to an array of objects with ownerId and count
      const countsArray = Object.entries(taskCounts).map(
        // tslint:disable-next-line:no-shadowed-variable
        ([ownerId, count]) => ({
          ownerId,
          count
        })
      );

      // Sort the array based on task counts
      countsArray.sort((a, b) => b.count - a.count);

      // Extract unique ownerIds for user lookup
      const ownerIds = countsArray.map(item => item.ownerId);

      // Fetch information about assigned users
      const getTotalAssignedUsers = await sendCoreMessage({
        subdomain,
        action: 'users.find',
        data: {
          query: { _id: { $in: ownerIds } }
        },
        isRPC: true,
        defaultValue: []
      });
      // Create a map for faster user lookup
      const assignedUsersMap = getTotalAssignedUsers.reduce((acc, user) => {
        acc[user._id] = user.details; // Assuming details contains user information
        return acc;
      }, {});

      const title = 'View the total number of closed tasks by reps';
      const data = countsArray.map(item => item.count);

      const labels = Object.values(assignedUsersMap).map(
        (t: any) => t.fullName
      );

      const datasets = { title, data, labels };
      return datasets;
    },

    filterTypes: [
      {
        fieldName: 'assignedUserIds',
        fieldType: 'select',
        multi: true,
        fieldQuery: 'users',
        fieldLabel: 'Select assigned users'
      }
    ]
  },

  {
    templateType: 'TaskAverageTimeToCloseByLabel',
    name: 'Task average time to close by label',
    chartTypes: ['bar', 'line', 'pie', 'doughnut', 'radar', 'polarArea'],
    // Bar Chart Table
    getChartResult: async (filter: any, subdomain: string) => {
      const tasks = await models?.Tasks.find({
        isComplete: false
      }).lean();

      const ticketData = await taskAverageTimeToCloseByLabel(tasks);
      // const labelIds = ticketData.map((result) => result.labelIds);
      const labelIdsCount = ticketData.flatMap(result => result.labelIds);

      const labels = await models?.PipelineLabels.find({
        _id: {
          $in: labelIdsCount
        }
      }).lean();

      if (!labels || labels.length === 0) {
        // Handle the case where no labels are found
        return {
          title: '',
          data: [],
          labels: []
        };
      }
      const enrichedTicketData = ticketData.map(task => {
        // Ensure labelIds is an array (default to empty array if undefined)
        const labelIds = Array.isArray(task.labelIds) ? task.labelIds : [];

        // Check if labelIds is not empty before mapping
        if (labelIds.length > 0) {
          const labelNames = labelIds.map(labelId => {
            const matchingLabel = labels.find(
              label => label && label._id === labelId
            ); // Check for undefined label
            return matchingLabel ? matchingLabel.name : '';
          });

          // Filter out undefined and empty string labels
          const filteredLabels = labelNames.filter(label => label !== '');

          return {
            ...task,
            labels: filteredLabels
          };
        } else {
          // If labelIds is empty, return the task as is
          return task;
        }
      });

      let setData: string[] = [];
      let stablesNames: string[] = [];

      enrichedTicketData
        .filter(t => t.timeDifference && t.labels && t.labels.length > 0)
        .slice(0, 100) // Limit to the first 10 elements
        .map(t => {
          setData.push(t.timeDifference);

          // Flatten and join the labels array into a single string
          const flattenedLabels = t.labels.join(' ');
          stablesNames.push(flattenedLabels);

          return {
            timeDifference: t.timeDifference,
            stageId: t.stageId,
            labelIds: t.labelIds,
            labels: flattenedLabels
            /* Add other properties as needed */
          };
        });

      const title = 'Task average time to close by label';

      const datasets = {
        title,
        data: setData,
        labels: stablesNames
      };
      return datasets;
    },
    filterTypes: []
  },

  {
    templateType: 'TaskAverageTimeToCloseByTags',
    name: 'Task average time to close by tags',
    chartTypes: ['bar', 'line', 'pie', 'doughnut', 'radar', 'polarArea'],
    // Bar Chart Table
    getChartResult: async (filter: any, subdomain: string) => {
      const tasks = await models?.Tasks.find({
        isComplete: false
      }).lean();

      const ticketData = await taskAverageTimeToCloseByLabel(tasks);
      // const labelIds = ticketData.map((result) => result.labelIds);
      const tagIdsCount = ticketData.flatMap(result => result.tagIds);

      const tagInfo = await sendTagsMessage({
        subdomain,
        action: 'find',
        data: {
          _id: { $in: tagIdsCount || [] }
        },
        isRPC: true,
        defaultValue: []
      });

      if (!tagIdsCount || tagIdsCount.length === 0) {
        // Handle the case where no labels are found
        return {
          title: '',
          data: [],
          tagIds: []
        };
      }
      const enrichedTicketData = ticketData.map(task => {
        // Ensure tagIds is an array (default to empty array if undefined)
        const tagIds = Array.isArray(task.tagIds) ? task.tagIds : [];

        // Check if tagIds is not empty before mapping
        if (tagIds.length > 0) {
          const tagNames = tagIds.map(tagId => {
            const matchingTag = tagInfo.find(tag => tag && tag._id === tagId); // Check for undefined tag
            return matchingTag ? matchingTag.name : '';
          });

          // Filter out undefined and empty string Tags
          const filteredTags = tagNames.filter(tag => tag !== '');

          return {
            ...task,
            tagIds: filteredTags
          };
        } else {
          // If tagIds is empty, return the task as is
          return task;
        }
      });

      let setData: string[] = [];
      let stagsNames: string[] = [];

      enrichedTicketData
        .filter(t => t.timeDifference && t.tags && t.tags.length > 0)
        .slice(0, 100) // Limit to the first 10 elements
        .map(t => {
          setData.push(t.timeDifference);

          // Flatten and join the tags array into a single string
          const flattenedTagss = t.tags.join(' ');
          stagsNames.push(flattenedTagss);

          return {
            timeDifference: t.timeDifference,
            stageId: t.stageId,
            tagIds: t.tagIds,
            tags: flattenedTagss
            /* Add other properties as needed */
          };
        });

      const title = 'Task average time to close by tags';

      const datasets = {
        title,
        data: setData,
        tags: stagsNames
      };
      return datasets;
    },
    filterTypes: []
  },

  {
    templateType: 'TaskAverageTimeToCloseByReps',
    name: 'Task average time to close by reps',
    chartTypes: ['bar', 'line', 'pie', 'doughnut', 'radar', 'polarArea'],
    // Bar Chart Table
    getChartResult: async (filter: any, subdomain: string) => {
      const selectedUserIds = filter.assignedUserIds || [];
      let tasks;
      try {
        if (selectedUserIds.length === 0) {
          // No selected users, so get all tickets
          tasks = await models?.Tasks.find({
            isComplete: true
          }).lean();
        } else {
          // Filter tickets based on selectedUserIds
          tasks = await models?.Tasks.find({
            assignedUserIds: {
              $in: selectedUserIds
            },
            isComplete: true
          }).lean();
        }

        // Check if the returned value is not an array
        if (!Array.isArray(tasks)) {
          throw new Error('Invalid data: tickets is not an array.');
        }

        // Continue processing tickets...
      } catch (error) {
        console.error('Error fetching tickets:', error);

        // Handle the error or return an appropriate response.
        // For example, you might set tickets to an empty array to avoid further issues
        tasks = [];
      }

      const ticketData = await calculateAverageTimeToCloseUser(tasks);
      // progress
      const getTotalAssignedUsers = await Promise.all(
        ticketData.map(async result => {
          return await sendCoreMessage({
            subdomain,
            action: 'users.find',
            data: {
              query: {
                _id: {
                  $in: result.assignedUserIds
                }
              }
            },
            isRPC: true,
            defaultValue: []
          });
        })
      );

      const result: any[] = [];

      for (const assignedUser of getTotalAssignedUsers) {
        assignedUser.map(itemsAdd => {
          const ticket = ticketData.find(item =>
            item.assignedUserIds.includes(itemsAdd._id)
          );

          if (ticket) {
            result.push({
              timeDifference: ticket.timeDifference,
              assignedUserIds: ticket.assignedUserIds,
              FullName: itemsAdd.details?.fullName || ''
            });
          }
        });
      }

      const data = Object.values(result).map((t: any) => t.timeDifference);
      const labels = Object.values(result).map((t: any) => t.FullName);

      const title = 'Task average time to close by reps';

      const datasets = { title, data, labels };

      return datasets;
    },
    filterTypes: [
      {
        fieldName: 'assignedUserIds',
        fieldType: 'select',
        multi: true,
        fieldQuery: 'users',
        fieldLabel: 'Select assigned users'
      }
    ]
  },
  {
    templateType: 'DealRevenueByStage',
    name: 'Deal revenue by stage',
    chartTypes: ['bar', 'line', 'pie', 'doughnut', 'radar', 'polarArea'],
    // Bar Chart Table
    getChartResult: async () => {
      const stages = await models?.Stages.find({
        $and: [
          { type: 'deal' },
          {
            $or: [
              { probability: { $lt: 0 } }, // Less than 0%
              { probability: { $gte: 100 } } // Greater than or equal to 100%
            ]
          }
        ]
      }).lean();
      if (stages) {
        let deals;
        await Promise.all(
          stages.map(async result => {
            deals = await models?.Deals.find({
              stageId: result._id,
              status: 'active' // Assuming 'active' is the status for open deals
            }).lean();
          })
        );
        // Example usage
        async function processData() {
          const dealsCounts = await amountProductData(deals);

          // Consolidate totalAmounts for the same stageId
          const consolidatedData = dealsCounts.reduce((consolidated, item) => {
            const existingItem = consolidated.find(
              c => c.stageId === item.stageId
            );

            if (existingItem) {
              existingItem.totalAmount += item.totalAmount;
            } else {
              consolidated.push({ ...item });
            }

            return consolidated;
          }, []);

          const data = consolidatedData.map((t: any) =>
            t.totalAmount.toString()
          );

          const stageIds = consolidatedData.map((t: any) => t.stageId);

          const stagesName = await models?.Stages.find({
            $and: [
              { type: 'deal' },
              {
                _id: {
                  $in: stageIds
                }
              }
            ]
          }).lean();

          const stageIdToNameMap =
            stagesName?.reduce((map, stage) => {
              map[stage._id] = stage.name;
              return map;
            }, {}) || {};

          const labels = consolidatedData.map(
            (t: any) => stageIdToNameMap[t.stageId]
          );

          const title = 'Deals open by current stage';
          const datasets = {
            title,
            data,
            labels
          };

          return datasets;
        }

        // Call processData function
        const data = await processData();

        return data;
      } else {
        throw new Error('No deal stages found');
      }
    },
    filterTypes: [
      {
        fieldName: 'assignedUserIds',
        fieldType: 'select',
        multi: true,
        fieldQuery: 'users',
        fieldLabel: 'Select assigned users'
      }
    ]
  },

  {
    templateType: 'DealsOpenByCurrentStage',
    name: 'Deals open by current stage',
    chartTypes: ['bar', 'line', 'pie', 'doughnut', 'radar', 'polarArea'],
    // Bar Chart Table
    getChartResult: async () => {
      const stages = await models?.Stages.find({
        $and: [
          { type: 'deal' },
          {
            $or: [
              { probability: { $lt: 0 } }, // Less than 0%
              { probability: { $gte: 100 } } // Greater than or equal to 100%
            ]
          }
        ]
      }).lean();
      if (stages) {
        const openDealsCounts = await Promise.all(
          stages.map(async stage => {
            const openDealsCount = await models?.Deals.countDocuments({
              stageId: stage._id,
              status: 'active' // Assuming 'active' is the status for open deals
            });

            const stageDetails = await models?.Stages.findById(
              stage._id
            ).lean();

            return {
              stageId: stage._id,
              stageName: stageDetails?.name, // Include other relevant stage information
              count: openDealsCount
            };
          })
        );

        const setData = Object.values(openDealsCounts).map((t: any) => t.count);
        const setLabels = Object.values(openDealsCounts).map(
          (t: any) => t.stageName
        );
        const title = 'Deals open by current stage';
        const datasets = { title, data: setData, labels: setLabels };

        return datasets;
      } else {
        throw new Error('No deal stages found');
      }
    },
    filterTypes: [
      {
        fieldName: 'assignedUserIds',
        fieldType: 'select',
        multi: true,
        fieldQuery: 'users',
        fieldLabel: 'Select assigned users'
      }
    ]
  },

  {
    templateType: 'ClosedRevenueByMonthWithDealTotalAndClosedRevenueBreakdown',
    name:
      'Closed revenue by month with deal total and closed revenue breakdown',
    chartTypes: ['bar', 'line', 'pie', 'doughnut', 'radar', 'polarArea'],
    // Bar Chart Table
    getChartResult: async (
      filter: any,
      subdomain: string,
      currentUser: IUserDocument,
      getDefaultPipelineId?: string
    ) => {
      const totalDeal = await models?.Deals.find({}).sort({
        createdAt: -1
      });
      const monthNames: string[] = [];
      const monthlyDealCount: number[] = [];
      if (totalDeal) {
        const now = new Date();
        const startOfYear = new Date(now.getFullYear(), 0, 1); // Get the start of the year
        const endOfYear = new Date(now.getFullYear(), 12, 31); // Get the start of the year
        const endRange = dayjs(
          new Date(totalDeal.at(-1)?.createdAt || endOfYear)
        );
        let rangeStart = dayjs(startOfYear).add(1, 'month');
        let rangeEnd = dayjs(startOfYear).add(2, 'month');
        while (rangeStart < endRange) {
          monthNames.push(rangeStart.format('MMMM'));
          const getDealsCountOfMonth = totalDeal.filter(
            deal =>
              new Date(deal.createdAt || '').getTime() >=
                rangeStart.toDate().getTime() &&
              new Date(deal.createdAt || '').getTime() <
                rangeEnd.toDate().getTime()
          );
          monthlyDealCount.push(getDealsCountOfMonth.length);
          rangeStart = rangeStart.add(1, 'month');
          rangeEnd = rangeEnd.add(1, 'month');
        }
      }
      const label = 'Deals count by created month';
      const datasets = [{ label, data: monthlyDealCount, labels: monthNames }];
      return datasets;
    },
    filterTypes: [
      {
        fieldName: 'dateRange',
        fieldType: 'date',
        fieldQuery: 'createdAt',
        fieldLabel: 'Date range'
      }
    ]
  },

  {
    templateType: 'DealAmountAverageByRep',
    name: 'Deal amount average by rep',
    chartTypes: ['bar', 'line', 'pie', 'doughnut', 'radar', 'polarArea'],
    getChartResult: async (filter: any, subdomain: string) => {
      const selectedUserIds = filter.assignedUserIds || [];
      let deals;
      try {
        if (selectedUserIds.length === 0) {
          deals = await models?.Deals.find({}).lean();
        } else {
          deals = await models?.Deals.find({
            assignedUserIds: {
              $in: selectedUserIds
            }
          }).lean();
        }
        if (!Array.isArray(deals)) {
          throw new Error('Invalid data: deals is not an array.');
        }
      } catch (error) {
        console.error('Error fetching tickets:', error);

        // Handle the error or return an appropriate response.
        // For example, you might set tickets to an empty array to avoid further issues
        deals = [];
      }
      const dealCounts = calculateAverageDealAmountByRep(deals);
      const getTotalAssignedUserIds = await Promise.all(
        dealCounts.map(async result => {
          return await sendCoreMessage({
            subdomain,
            action: 'users.find',
            data: {
              query: {
                _id: {
                  $in: result.userId
                }
              }
            },
            isRPC: true,
            defaultValue: []
          });
        })
      );
      const assignedUsersMap = {};

      for (let i = 0; i < getTotalAssignedUserIds.length; i++) {
        const assignedUsers = getTotalAssignedUserIds[i];
        for (const assignedUser of assignedUsers) {
          assignedUsersMap[assignedUser._id] = {
            fullName: assignedUser.details?.fullName,
            amount: dealCounts[i].amount // Match the amount with the correct index
          };
        }
      }
      const data = Object.values(assignedUsersMap).map((t: any) => t.amount);
      const labels = Object.values(assignedUsersMap).map(
        (t: any) => t.fullName
      );

      const title = 'Deal amount average by rep';
      const datasets = { title, data, labels };
      return datasets;
    },

    filterTypes: [
      {
        fieldName: 'assignedUserIds',
        fieldType: 'select',
        multi: true,
        fieldQuery: 'users',
        fieldLabel: 'Select assigned users'
      }
    ]
  },
  {
    templateType: 'DealLeaderboardAmountClosedByRep',
    name: 'Deal leader board - amount closed by rep',
    chartTypes: ['bar', 'line', 'pie', 'doughnut', 'radar', 'polarArea'],
    getChartResult: async (filter: any, subdomain: string) => {
      const selectedUserIds = filter.assignedUserIds || [];
      let deals;
      try {
        if (selectedUserIds.length === 0) {
          deals = await models?.Deals.find({
            isComplete: true
          }).lean();
        } else {
          deals = await models?.Deals.find({
            $and: [
              { isComplete: true },
              { assignedUserIds: { $in: selectedUserIds } }
            ]
          }).lean();
        }
        if (!Array.isArray(deals)) {
          throw new Error('Invalid data: deals is not an array.');
        }
      } catch (error) {
        console.error('Error fetching tickets:', error);

        // Handle the error or return an appropriate response.
        // For example, you might set tickets to an empty array to avoid further issues
        deals = [];
      }
      const dealCounts = calculateAverageDealAmountByRep(deals);
      const getTotalAssignedUserIds = await Promise.all(
        dealCounts.map(async result => {
          return await sendCoreMessage({
            subdomain,
            action: 'users.find',
            data: {
              query: {
                _id: {
                  $in: result.userId
                }
              }
            },
            isRPC: true,
            defaultValue: []
          });
        })
      );
      const assignedUsersMap = {};

      for (let i = 0; i < getTotalAssignedUserIds.length; i++) {
        const assignedUsers = getTotalAssignedUserIds[i];
        for (const assignedUser of assignedUsers) {
          assignedUsersMap[assignedUser._id] = {
            fullName: assignedUser.details?.fullName,
            amount: dealCounts[i].amount // Match the amount with the correct index
          };
        }
      }
      const data = Object.values(assignedUsersMap).map((t: any) => t.amount);
      const labels = Object.values(assignedUsersMap).map(
        (t: any) => t.fullName
      );

      const title = 'Deal amount average by rep';
      const datasets = { title, data, labels };
      return datasets;
    },
    filterTypes: [
      {
        fieldName: 'assignedUserIds',
        fieldType: 'select',
        multi: true,
        fieldQuery: 'users',
        fieldLabel: 'Select assigned users'
      }
    ]
  },
  {
    templateType: 'DealsByLastModifiedDate',
    name: 'Deals by last modified date',
    chartTypes: ['bar', 'line', 'pie', 'doughnut', 'radar', 'polarArea'],
    getChartResult: async (filter: any, subdomain: string) => {
      const deals = await models?.Deals.find({});

      const dealsCount = deals?.map(deal => {
        return {
          dealName: deal.name,
          dealStage: deal.stageId,
          currentStatus: deal.status,
          lastModifiedDate: deal.modifiedAt,
          stageChangedDate: deal.stageChangedDate
        };
      });

      const sortedData = dealsCount?.sort((a, b) => {
        const dateA = new Date(a.lastModifiedDate ?? 0);
        const dateB = new Date(b.lastModifiedDate ?? 0);
        return dateB.getTime() - dateA.getTime();
      });

      const data = sortedData?.map((deal: any) => {
        const dateWithTime = new Date(deal.lastModifiedDate);
        const dateOnly = dateWithTime.toISOString().substring(0, 10); // Extract YYYY-MM-DD
        return dateOnly;
      });

      const labels = sortedData?.map((deal: any) => deal.dealName);
      const label = 'Deals count by modified month';
      const datasets = [
        {
          type: 'line',
          label,
          data: data || [], // Ensure data is an array even if sortedData is undefined
          options: {
            scales: {
              x: {
                type: 'time',
                time: {
                  displayFormats: {
                    quarter: 'MMM YYYY'
                  }
                }
              }
            }
          },
          labels
        }
      ];
      return datasets;
    },

    filterTypes: [
      {
        fieldName: 'dateRange',
        fieldType: 'date',
        fieldQuery: 'createdAt',
        fieldLabel: 'Date range'
      }
    ]
  },

  {
    templateType: 'DealsClosedLostAllTimeByRep',
    name: 'Deals closed lost all time by rep',
    chartTypes: ['bar', 'line', 'pie', 'doughnut', 'radar', 'polarArea'],
    // Bar Chart Table
    getChartResult: async (filter: any, subdomain: string) => {
      const selectedUserIds = filter.assignedUserIds || [];
      const stages = await models?.Stages.find({
        $and: [{ type: 'deal' }, { probability: 'Lost' }]
      }).lean();
      let dealCounts;
      let data;
      if (stages) {
        if (selectedUserIds.length === 0) {
          dealCounts = await Promise.all(
            stages.map(async result => {
              return await models?.Deals.find({
                stageId: result._id
              }).lean();
            })
          );
        } else {
          dealCounts = await Promise.all(
            stages.map(async result => {
              return await models?.Deals.find({
                $and: [
                  { stageId: result._id },
                  { assignedUserIds: { $in: selectedUserIds } }
                ]
              }).lean();
            })
          );
        }

        data = await Promise.all(
          dealCounts.map(async result => {
            const counts = result.filter(element => element.status === 'active')
              .length;
            const users = await Promise.all(
              result
                .flat() // Flatten the array of arrays
                .map(async item => {
                  const assignedUserIds = item.assignedUserIds;
                  if (assignedUserIds && assignedUserIds.length > 0) {
                    return await sendCoreMessage({
                      subdomain,
                      action: 'users.find',
                      data: {
                        query: {
                          _id: {
                            $in: assignedUserIds
                          }
                        }
                      },
                      isRPC: true,
                      defaultValue: []
                    });
                  }
                })
            );
            return { count: counts, user: users }; // Removed the extra array here
          })
        );
      } else {
        throw new Error('Stages are undefined.');
      }
      // Extract counts

      const resultArray: Array<{ count: string; fullName: string }> = [];
      data.map(item => {
        const users = item.user;

        if (Array.isArray(users)) {
          users.forEach(result => {
            if (Array.isArray(result)) {
              result.forEach(items => {
                if (items && items.details) {
                  resultArray.push({
                    count: item.count.toString(),
                    fullName: items.details.fullName
                  });
                }
              });
            }
          });
        }

        return resultArray;
      });

      const uniqueUserEntries = Array.from(
        new Set(resultArray.map(entry => JSON.stringify(entry))),
        str => JSON.parse(str)
      );
      const setData = Object.values(uniqueUserEntries).map((t: any) => t.count);
      const setLabels = Object.values(uniqueUserEntries).map(
        (t: any) => t.fullName
      );
      const title = 'Deals closed lost all time by rep';
      const datasets = { title, data: setData, labels: setLabels };
      return datasets;
    },
    filterTypes: [
      {
        fieldName: 'assignedUserIds',
        fieldType: 'select',
        multi: true,
        fieldQuery: 'users',
        fieldLabel: 'Select assigned users'
      }
    ]
  },

  {
    templateType: 'DealsClosedWonAllTimeByRep',
    name: 'Deals closed won all time by rep',
    chartTypes: ['bar', 'line', 'pie', 'doughnut', 'radar', 'polarArea'],
    // Bar Chart Table
    getChartResult: async (filter: any, subdomain: string) => {
      const selectedUserIds = filter.assignedUserIds || [];
      const stages = await models?.Stages.find({
        $and: [{ type: 'deal' }, { probability: 'Won' }]
      }).lean();
      let dealCounts;
      let data;
      if (stages) {
        if (selectedUserIds.length === 0) {
          dealCounts = await Promise.all(
            // tslint:disable-next-line:no-shadowed-variable
            stages.map(async result => {
              return await models?.Deals.find({
                stageId: result._id
              }).lean();
            })
          );
        } else {
          dealCounts = await Promise.all(
            // tslint:disable-next-line:no-shadowed-variable
            stages.map(async result => {
              return await models?.Deals.find({
                $and: [
                  { stageId: result._id },
                  { assignedUserIds: { $in: selectedUserIds } }
                ]
              }).lean();
            })
          );
        }

        data = await Promise.all(
          dealCounts.map(async result => {
            const counts = result.filter(element => element.status === 'active')
              .length;
            const users = await Promise.all(
              result
                .flat() // Flatten the array of arrays
                .map(async item => {
                  const assignedUserIds = item.assignedUserIds;
                  if (assignedUserIds && assignedUserIds.length > 0) {
                    return await sendCoreMessage({
                      subdomain,
                      action: 'users.find',
                      data: {
                        query: {
                          _id: {
                            $in: assignedUserIds
                          }
                        }
                      },
                      isRPC: true,
                      defaultValue: []
                    });
                  }
                })
            );
            return { count: counts, user: users }; // Removed the extra array here
          })
        );
      } else {
        throw new Error('Stages are undefined.');
      }
      // Extract counts

      const resultArray: Array<{ count: string; fullName: string }> = [];
      data.map(item => {
        const users = item.user;

        if (Array.isArray(users)) {
          users.forEach(result => {
            if (Array.isArray(result)) {
              result.forEach(items => {
                if (items && items.details) {
                  resultArray.push({
                    count: item.count.toString(),
                    fullName: items.details.fullName
                  });
                }
              });
            }
          });
        }

        return resultArray;
      });

      const uniqueUserEntries = Array.from(
        new Set(resultArray.map(entry => JSON.stringify(entry))),
        str => JSON.parse(str)
      );
      const setData = Object.values(uniqueUserEntries).map((t: any) => t.count);
      const setLabels = Object.values(uniqueUserEntries).map(
        (t: any) => t.fullName
      );
      const title = 'Deals closed lost all time by rep';
      const datasets = { title, data: setData, labels: setLabels };
      return datasets;
    },
    filterTypes: [
      {
        fieldName: 'assignedUserIds',
        fieldType: 'select',
        multi: true,
        fieldQuery: 'users',
        fieldLabel: 'Select assigned users'
      }
    ]
  },

  {
    templateType: 'TicketAverageTimeToCloseOverTime',
    name: 'Ticket average time to close over time',
    chartTypes: ['bar', 'line', 'pie', 'doughnut', 'radar', 'polarArea'],
    // Bar Chart Table
    getChartResult: async () => {
      const ticket = await models?.Tickets.find({
        isComplete: true
      }).lean();
      if (!ticket || ticket.length === 0) {
        console.error(
          'No ticket found in the database matching the specified criteria.'
        );
        // Handle the case when no items are found
        return null; // or some default value
      }

      const title =
        'View the average amount of time it takes your reps to close tickets. See how this tracks over time.';
      const ticketData = await calculateAverageTimeToClose(ticket);
      const labels = ticketData.map(duration => {
        const { hours, minutes, seconds } = convertHoursToHMS(duration);
        return `${hours}h ${minutes}m ${seconds}s`;
      });

      const datasets = { title, ticketData, labels };

      return datasets;
    },
    filterTypes: []
  },
  {
    templateType: 'TicketClosedTotalsByRep',
    name: 'Ticket closed totals by rep',
    chartTypes: ['bar'],
    // Bar Chart Table
    getChartResult: async (filter: any, subdomain: string) => {
      const selectedUserIds = filter.assignedUserIds || [];
      let tickets;

      try {
        if (selectedUserIds.length === 0) {
          // No selected users, so get all tickets
          tickets = await models?.Tickets.find({ isComplete: true }).lean();
        } else {
          // Filter tickets based on selectedUserIds
          tickets = await models?.Tickets.find({
            assignedUserIds: { $in: selectedUserIds },
            isComplete: true
          }).lean();
        }

        // Check if the returned value is not an array
        if (!Array.isArray(tickets)) {
          throw new Error('Invalid data: tickets is not an array.');
        }

        // Continue processing tickets...
      } catch (error) {
        console.error('Error fetching tickets:', error);

        // Handle the error or return an appropriate response.
        // For example, you might set tickets to an empty array to avoid further issues
        tickets = [];
      }

      // Calculate ticket counts
      const ticketCounts = calculateTicketCounts(tickets);

      // Convert the counts object to an array of objects with ownerId and count
      const countsArray = Object.entries(ticketCounts).map(
        // tslint:disable-next-line:no-shadowed-variable
        ([ownerId, count]) => ({
          ownerId,
          count
        })
      );

      // Sort the array based on ticket counts
      countsArray.sort((a, b) => b.count - a.count);

      // Extract unique ownerIds for user lookup
      const ownerIds = countsArray.map(item => item.ownerId);

      // Fetch information about assigned users
      const getTotalAssignedUsers = await sendCoreMessage({
        subdomain,
        action: 'users.find',
        data: {
          query: { _id: { $in: ownerIds } }
        },
        isRPC: true,
        defaultValue: []
      });
      // Create a map for faster user lookup
      const assignedUsersMap = getTotalAssignedUsers.reduce((acc, user) => {
        acc[user._id] = user.details; // Assuming details contains user information
        return acc;
      }, {});

      const title =
        'View the total number of tickets closed by their assigned owner';
      const data = countsArray.map(item => item.count);

      const labels = Object.values(assignedUsersMap).map(
        (t: any) => t.fullName
      );

      const datasets = { title, data, labels };

      return datasets;
    },

    filterTypes: [
      {
        fieldName: 'assignedUserIds',
        fieldType: 'select',
        multi: true,
        fieldQuery: 'users',
        fieldLabel: 'Select assigned users'
      }
    ]
  },
  {
    templateType: 'TicketTotalsByStatus',
    name: 'Ticket totals by status',
    chartTypes: ['bar'],
    // Bar Chart Table
    getChartResult: async (filter: any, subdomain: string) => {
      const tickets = await models?.Tickets.find({}).lean();
      const ticketTotalsByStatus = calculateTicketTotalsByStatus(tickets);
      // Convert the counts object to an array of objects with ownerId and count
      const countsArray = Object.entries(ticketTotalsByStatus).map(
        // tslint:disable-next-line:no-shadowed-variable
        ([status, count]) => ({
          status,
          count
        })
      );
      const title =
        'View the total number of tickets in each part of your support queue';
      const labels = Object.values(countsArray).map((t: any) => t.status);
      const data = Object.values(countsArray).map((t: any) => t.count);

      const datasets = { title, data, labels };
      return datasets;
    },

    filterTypes: []
  },
  {
    templateType: 'TicketTotalsByLabelPriorityTag',
    name: 'Ticket totals by label/priority/tag/',
    chartTypes: ['bar', 'line', 'pie', 'doughnut', 'radar', 'polarArea'],

    getChartResult: async (filter: any, subdomain: string) => {
      const query = {
        labelIds: { $in: filter.labelIds },
        tagIds: { $in: filter.tagIds },
        priority: filter.priority
      } as any;

      const tickets = await models?.Tickets.find().lean();
      try {
        if (!Array.isArray(tickets)) {
          throw new Error('Invalid data: tickets is not an array.');
        }

        // Calculate ticket totals by label, priority, and tag
        const ticketTotals = calculateTicketTotalsByLabelPriorityTag(tickets);
        let labelIds: string[] = [];
        let tagIds: string[] = [];
        let priorities: string[] = [];

        Object.entries(ticketTotals).forEach(([key, value]) => {
          if (key.startsWith('labelIds:')) {
            labelIds.push(key.replace('labelIds:', ''));
          } else if (key.startsWith('tagIds:')) {
            tagIds.push(key.replace('tagIds:', ''));
          } else if (key.startsWith('priority:')) {
            priorities.push(key.replace('priority:', ''));
          }
        });

        // Remove single quotes from both tagIds and labelIds
        tagIds = tagIds.map(tagId => tagId.replace(/'/g, ''));
        labelIds = labelIds.map(labelId => labelId.replace(/'/g, ''));
        priorities = priorities.map(priority => priority.replace(/'/g, ''));

        const tagInfo = await sendTagsMessage({
          subdomain,
          action: 'find',
          data: {
            _id: { $in: tagIds || [] }
          },
          isRPC: true,
          defaultValue: []
        });
        const tagNames = tagInfo.map(tag => tag.name);

        const labels = await models?.PipelineLabels.find({
          _id: { $in: labelIds }
        });
        if (!labels || labels.length === 0) {
          // Handle the case where no labels are found
          return { title: '', data: [], labels: [] };
        }
        // Adjust the property names based on your actual data structure
        const labelNames = labels.map(label => label.name);

        // Combine labelNames with tagNames and other keys
        const allLabels = [...priorities, ...labelNames, ...tagNames];

        // Remove additional characters from labels and tags
        const simplifiedLabels = allLabels.map(label =>
          label.replace(/(labelIds:|tagIds:|')/g, '')
        );

        const title =
          '  View the total number of ticket totals by label/priority/tag/ ';

        // Assuming you have a relevant property for the chart data
        const data = Object.values(ticketTotals);

        // Combine the arrays into datasets
        const datasets = { title, data, labels: simplifiedLabels };

        return datasets;
      } catch (error) {
        console.error('Error fetching tickets:', error);

        // Handle the error or return an appropriate response.
        // For example, you might set datasets to an empty array to avoid further issues
        return { title: '', data: [], labels: [] };
      }
    },
    filterTypes: [
      {
        fieldName: 'name',
        fieldType: 'select',
        fieldQuery: 'pipeline_labels',
        fieldLabel: 'Select Labels'
      },
      {
        fieldName: 'tagIds',
        fieldType: 'select',
        fieldQuery: 'tags',
        fieldLabel: 'Select tag'
      },
      {
        fieldName: 'priority',
        fieldType: 'select',
        fieldQuery: PRIORITIES.ALL.map(priority => ({
          value: priority.name,
          label: priority.name,
          color: priority.color
        })),
        fieldLabel: 'Select priority'
      }
    ]
  },
  {
    templateType: 'TicketTotalsOverTime',
    name: 'Ticket totals over time',
    chartTypes: ['bar', 'line', 'pie', 'doughnut', 'radar', 'polarArea'],

    // Bar Chart Table
    getChartResult: async (filter: any, subdomain: string) => {
      const totalTicked = await models?.Tickets.find({}).sort({
        createdAt: -1
      });
      const monthNames: string[] = [];
      const monthlyTickedCount: number[] = [];

      if (totalTicked) {
        const now = new Date(); // Get the current date
        const startOfYear = new Date(now.getFullYear(), 0, 1); // Get the start of the year
        const endOfYear = new Date(now.getFullYear(), 12, 31); // Get the start of the year
        const endRange = dayjs(
          new Date(totalTicked.at(-1)?.createdAt || endOfYear)
        );

        let startRange = dayjs(startOfYear);

        while (startRange < endRange) {
          monthNames.push(startRange.format('MMMM'));

          const getStartOfNextMonth = startRange.add(1, 'month').toDate();
          const getTickedCountOfMonth = totalTicked.filter(
            ticked =>
              new Date(ticked.createdAt || '').getTime() >=
                startRange.toDate().getTime() &&
              new Date(ticked.createdAt || '').getTime() <
                getStartOfNextMonth.getTime()
          );
          monthlyTickedCount.push(getTickedCountOfMonth.length);
          startRange = startRange.add(1, 'month');
        }
      }
      const label = 'View the total number of tickets created over a set time';
      const datasets = [
        { label, data: monthlyTickedCount, labels: monthNames }
      ];
      return datasets;
    },
    filterTypes: [
      {
        fieldName: 'createdAt',
        fieldType: 'select',
        fieldQuery: 'createdAt',
        fieldLabel: 'Select date range'
      }
    ]
  },
  {
    templateType: 'TicketAverageTimeToCloseByRep',
    name: 'Ticket average time to close by rep',
    chartTypes: ['bar', 'line', 'pie', 'doughnut', 'radar', 'polarArea'],
    // Bar Chart Table
    getChartResult: async (filter: any, subdomain: string) => {
      const selectedUserIds = filter.assignedUserIds || [];
      let tickets;
      try {
        if (selectedUserIds.length === 0) {
          // No selected users, so get all tickets
          tickets = await models?.Tickets.find({
            isComplete: true
          })
            .lean()
            .limit(30);
        } else {
          // Filter tickets based on selectedUserIds
          tickets = await models?.Tickets.find({
            assignedUserIds: {
              $in: selectedUserIds
            },
            isComplete: true
          }).lean();
        }

        // Check if the returned value is not an array
        if (!Array.isArray(tickets)) {
          throw new Error('Invalid data: tickets is not an array.');
        }

        // Continue processing tickets...
      } catch (error) {
        console.error('Error fetching tickets:', error);

        // Handle the error or return an appropriate response.
        // For example, you might set tickets to an empty array to avoid further issues
        tickets = [];
      }

      const ticketData = await calculateAverageTimeToCloseUser(tickets);

      const getTotalAssignedUsers = await Promise.all(
        tickets.map(async result => {
          return await sendCoreMessage({
            subdomain,
            action: 'users.find',
            data: {
              query: {
                _id: {
                  $in: result.assignedUserIds
                }
              }
            },
            isRPC: true,
            defaultValue: []
          });
        })
      );

      const result: any[] = [];

      for (const assignedUser of getTotalAssignedUsers) {
        assignedUser.map(itemsAdd => {
          const ticket = ticketData.find(item =>
            item.assignedUserIds.includes(itemsAdd._id)
          );

          if (ticket) {
            result.push({
              timeDifference: ticket.timeDifference,
              assignedUserIds: ticket.assignedUserIds,
              FullName: itemsAdd.details?.fullName || ''
            });
          }
        });
      }

      const data = Object.values(result).map((t: any) => t.timeDifference);
      const labels = Object.values(result).map((t: any) => t.FullName);

      const title =
        'View the average amount of time it takes for a rep to close a ticket';

      const datasets = {
        title,
        data,
        labels
      };

      return datasets;
    },
    filterTypes: [
      {
        fieldName: 'assignedUserIds',
        fieldType: 'select',
        fieldQuery: 'users',
        fieldLabel: 'Select assigned user'
      }
    ]
  },
  {
    templateType: 'TicketAverageTimeToClose',
    name: 'Ticket average time to close',
    chartTypes: ['bar', 'line', 'pie', 'doughnut', 'radar', 'polarArea'],
    // Table
    getChartResult: async () => {
      const ticket = await models?.Tickets.find({
        isComplete: true
      }).lean();
      if (!ticket || ticket.length === 0) {
        console.error(
          'No ticket found in the database matching the specified criteria.'
        );
        // Handle the case when no items are found
        return null; // or some default value
      }
      const data = await calculateAverageTimeToClose(ticket);

      const labels = data.map(duration => {
        const { hours, minutes, seconds } = convertHoursToHMS(duration);
        return `${hours}h ${minutes}m ${seconds}s`;
      });
      const title =
        'View the average amount of time it takes for your reps to close tickets';

      // const datasets = [{ label, data: ticketData, labels }];
      const datasets = { title, data, labels };

      return datasets;
    },
    filterTypes: []
  },

  {
    templateType: 'dealsChart',
    name: 'Deals chart',
    chartTypes: ['bar', 'line', 'pie', 'doughnut', 'radar', 'polarArea'],
    getChartResult: async (
      filter: any,
      subdomain: string,
      currentUser: IUserDocument,
      getDefaultPipelineId?: string
    ) => {
      // demonstration filters
      const getTotalAssignedUserIds: string[] = [];

      const totalDeals = await models?.Deals.find({
        assignedUserIds: { $exists: true }
      });

      if (totalDeals) {
        for (const deal of totalDeals) {
          if (deal.assignedUserIds) {
            getTotalAssignedUserIds.push(...deal.assignedUserIds);
          }
        }
      }

      const totalAssignedUserIds = new Set(getTotalAssignedUserIds);

      const DEFAULT_FILTER = {
        assignedUserIds: Array.from(totalAssignedUserIds),
        userId: currentUser._id,
        pipelineId: getDefaultPipelineId
      };

      const query = {
        assignedUserIds: { $in: DEFAULT_FILTER.assignedUserIds },
        pipelineId: DEFAULT_FILTER.pipelineId
      } as any;

      if (filter && filter.assignedUserIds) {
        query.assignedUserIds.$in = filter.assignedUserIds;
      }

      if (filter && filter.pipelineId) {
        query.pipelineId = filter.pipelineId;
      }

      const getTotalAssignedUsers = await sendCoreMessage({
        subdomain,
        action: 'users.find',
        data: {
          query: { _id: { $in: query.assignedUserIds.$in } }
        },
        isRPC: true,
        defaultValue: []
      });

      const assignedUsersMap = {};
      const deals = await models?.Deals.find(query);

      for (const assignedUser of getTotalAssignedUsers) {
        assignedUsersMap[assignedUser._id] = {
          fullName: assignedUser.details?.fullName,
          assignedDealsCount: deals?.filter(deal =>
            deal.assignedUserIds?.includes(assignedUser._id)
          ).length
        };
      }

      const data = Object.values(assignedUsersMap).map(
        (t: any) => t.assignedDealsCount
      );
      const labels = Object.values(assignedUsersMap).map(
        (t: any) => t.fullName
      );

      const title = 'Deals chart by assigned users';

      const datasets = { title, data, labels };
      return datasets;
    },

    filterTypes: [
      {
        fieldName: 'assignedUserIds',
        fieldType: 'select',
        multi: true,
        fieldQuery: 'users',
        fieldLabel: 'Select assigned users'
      },
      {
        fieldName: 'assignedDepartmentIds',
        fieldType: 'select',
        multi: true,
        fieldQuery: 'departments',
        fieldLabel: 'Select assigned departments'
      },
      {
        fieldName: 'dateRange',
        fieldType: 'date',
        fieldQuery: 'createdAt',
        fieldLabel: 'Select date range'
      }
    ]
  },
  {
    templateType: 'dealsChartByMonth',
    name: 'Deals chart by month',
    chartTypes: ['bar', 'line', 'pie', 'doughnut', 'radar', 'polarArea'],
    getChartResult: async (
      filter: any,
      subdomain: string,
      currentUser: IUserDocument,
      getDefaultPipelineId?: string
    ) => {
      const totalDeals = await models?.Deals.find({}).sort({ createdAt: -1 });
      const monthNames: string[] = [];
      const monthlyDealsCount: number[] = [];

      if (totalDeals) {
        const now = new Date(); // Get the current date
        const startOfYear = new Date(now.getFullYear(), 0, 1); // Get the start of the year
        const endOfYear = new Date(now.getFullYear(), 12, 31); // Get the start of the year
        const endRange = dayjs(
          new Date(totalDeals.at(-1)?.createdAt || endOfYear)
        );

        let startRange = dayjs(startOfYear);

        while (startRange < endRange) {
          monthNames.push(startRange.format('MMMM'));

          const getStartOfNextMonth = startRange.add(1, 'month').toDate();
          const getDealsCountOfMonth = totalDeals.filter(
            deal =>
              new Date(deal.createdAt || '').getTime() >=
                startRange.toDate().getTime() &&
              new Date(deal.createdAt || '').getTime() <
                getStartOfNextMonth.getTime()
          );
          monthlyDealsCount.push(getDealsCountOfMonth.length);
          startRange = startRange.add(1, 'month');
        }
      }

      const title = 'Deals count by created month';
      const datasets = { title, data: monthlyDealsCount, labels: monthNames };

      return datasets;
    },

    filterTypes: [
      {
        fieldName: 'dateRange',
        fieldType: 'date',
        fieldQuery: 'createdAt',
        fieldLabel: 'Date range'
      }
    ]
  }
];

const getChartResult = async ({ subdomain, data }) => {
  const { templateType, filter, currentUser } = data;

  const template =
    chartTemplates.find(t => t.templateType === templateType) || ({} as any);

  return template.getChartResult(filter, subdomain, currentUser);
};

export default {
  chartTemplates,
  reportTemplates,
  getChartResult
};

function taskClosedByRep(tickets: any) {
  // tslint:disable-next-line:no-shadowed-variable
  const ticketCounts: Record<string, number> = {};

  // Check if tickets is an array
  if (!Array.isArray(tickets)) {
    console.error('Invalid input: tickets should be an array.');
    return ticketCounts;
  }

  tickets.forEach(ticket => {
    const labelIds = (ticket.labelIds as string[]) || [];

    if (labelIds.length === 0) {
      return;
    }
    labelIds.forEach(ownerId => {
      ticketCounts[ownerId] = (ticketCounts[ownerId] || 0) + 1;
    });
  });

  return ticketCounts;
}

function taskClosedByTagsRep(tasks: any) {
  // tslint:disable-next-line:no-shadowed-variable
  const ticketCounts: Record<string, number> = {};

  // Check if tickets is an array
  if (!Array.isArray(tasks)) {
    console.error('Invalid input: tasks should be an array.');
    return ticketCounts;
  }

  tasks.forEach(ticket => {
    const tagIds = (ticket.tagIds as string[]) || [];

    if (tagIds.length === 0) {
      return;
    }
    tagIds.forEach(ownerId => {
      ticketCounts[ownerId] = (ticketCounts[ownerId] || 0) + 1;
    });
  });

  return ticketCounts;
}
function calculateTicketCounts(tickets: any) {
  // tslint:disable-next-line:no-shadowed-variable
  const ticketCounts: Record<string, number> = {};

  // Check if tickets is an array
  if (!Array.isArray(tickets)) {
    console.error('Invalid input: tickets should be an array.');
    return ticketCounts;
  }

  tickets.forEach(ticket => {
    const assignedUserIds = (ticket.assignedUserIds as string[]) || [];

    if (assignedUserIds.length === 0) {
      return;
    }

    assignedUserIds.forEach(ownerId => {
      ticketCounts[ownerId] = (ticketCounts[ownerId] || 0) + 1;
    });
  });

  return ticketCounts;
}

function amountProductData(deals: any[]): Promise<any[]> {
  return new Promise(resolve => {
    const repAmounts: Record<string, any> = {};

    deals.forEach(deal => {
      if (deal.productsData && deal.status === 'active') {
        const productsData = deal.productsData;
        productsData.forEach(product => {
          if (product.amount) {
            if (!repAmounts[deal.stageId]) {
              repAmounts[deal.stageId] = {
                totalAmount: 0,
                stageId: deal.stageId
              };
            }

            repAmounts[deal.stageId].totalAmount += product.amount;
          }
        });
      }
    });

    // Convert the repAmounts object into an array
    const resultArray = Object.values(repAmounts);

    resolve(resultArray);
  });
}

// Function to calculate the average deal amounts by rep
function calculateAverageDealAmountByRep(deals) {
  const repAmounts = {};

  deals.forEach(deal => {
    if (deal.productsData && deal.status === 'active') {
      const productsData = deal.productsData;

      productsData.forEach(product => {
        if (deal.assignedUserIds && product.amount) {
          const assignedUserIds = deal.assignedUserIds;

          assignedUserIds.forEach(userId => {
            repAmounts[userId] = repAmounts[userId] || {
              totalAmount: 0,
              count: 0
            };
            repAmounts[userId].totalAmount += product.amount;
            repAmounts[userId].count += 1;
          });
        }
      });
    }
  });

  const result: Array<{ userId: string; amount: string }> = [];

  // tslint:disable-next-line:forin
  for (const userId in repAmounts) {
    const totalAmount = repAmounts[userId].totalAmount;
    const count = repAmounts[userId].count;
    const averageAmount = count > 0 ? totalAmount / count : 0;

    result.push({ userId, amount: averageAmount.toFixed(3) });
  }

  return result;
}

function calculateTicketTotalsByStatus(tickets: any) {
  const ticketTotals = {};

  // Loop through tickets
  tickets.forEach(ticket => {
    const status = ticket.status;

    // Check if status exists
    if (status !== undefined && status !== null) {
      // Initialize or increment status count
      ticketTotals[status] = (ticketTotals[status] || 0) + 1;
    }
  });

  // Return the result
  return ticketTotals;
}

function calculateTicketTotalsByLabelPriorityTag(tickets: any) {
  return tickets.reduce((ticketTotals: Record<string, number>, ticket) => {
    const labels = ticket.labelIds || [];
    const priority = ticket.priority || 'Default'; // Replace 'Default' with the default priority if not available
    const tags = ticket.tagIds || [];
    // Increment counts for each label
    labels.forEach(label => {
      const labelKey = `labelIds:'${label}'`;
      ticketTotals[labelKey] = (ticketTotals[labelKey] || 0) + 1;
    });
    // Increment counts for each priority
    const priorityKey = `priority:'${priority}'`;
    ticketTotals[priorityKey] = (ticketTotals[priorityKey] || 0) + 1;

    // Increment counts for each tag
    tags.forEach(tag => {
      const tagKey = `tagIds:'${tag}'`;
      ticketTotals[tagKey] = (ticketTotals[tagKey] || 0) + 1;
    });

    return ticketTotals;
  }, {});
}

const calculateAverageTimeToClose = tickets => {
  // Filter out tickets without close dates
  const closedTickets = tickets.filter(
    ticketItem => ticketItem.modifiedAt && ticketItem.createdAt
  );

  if (closedTickets.length === 0) {
    console.error('No closed tickets found.');
    return null;
  }

  // Calculate time to close for each ticket in milliseconds
  const timeToCloseArray = closedTickets.map(ticketItem => {
    const createdAt = new Date(ticketItem.createdAt).getTime();
    const modifiedAt = new Date(ticketItem.modifiedAt).getTime();

    // Check if both dates are valid
    if (!isNaN(createdAt) && !isNaN(modifiedAt)) {
      return modifiedAt - createdAt;
    } else {
      console.error('Invalid date format for a ticket:', ticketItem);
      return null;
    }
  });

  // Filter out invalid date differences
  const validTimeToCloseArray = timeToCloseArray.filter(time => time !== null);

  if (validTimeToCloseArray.length === 0) {
    console.error('No valid time differences found.');
    return null;
  }

  const timeToCloseInHoursArray = validTimeToCloseArray.map(time =>
    (time / (1000 * 60 * 60)).toFixed(3)
  );

  return timeToCloseInHoursArray;
};
function convertHoursToHMS(durationInHours) {
  const hours = Math.floor(durationInHours);
  const minutes = Math.floor((durationInHours - hours) * 60);
  const seconds = Math.floor(((durationInHours - hours) * 60 - minutes) * 60);

  return { hours, minutes, seconds };
}
const taskAverageTimeToCloseByLabel = async tasks => {
  const closedTasks = tasks.filter(
    ticketItem => ticketItem.modifiedAt && ticketItem.createdAt
  );

  if (closedTasks.length === 0) {
    console.error('No closed Tasks found.');
    return null;
  }

  // Calculate time to close for each ticket in milliseconds
  const timeToCloseArray = closedTasks.map(ticketItem => {
    const createdAt = new Date(ticketItem.createdAt).getTime();
    const modifiedAt = new Date(ticketItem.modifiedAt).getTime();

    // Check if both dates are valid
    if (!isNaN(createdAt) && !isNaN(modifiedAt)) {
      return {
        timeDifference: modifiedAt - createdAt,
        stageId: ticketItem.stageId, // Include assignedUserIds
        labelIds: ticketItem.labelIds,
        tagIds: ticketItem.tagIds
      };
    } else {
      console.error('Invalid date format for a ticket:', ticketItem);
      return null;
    }
  });

  // Filter out invalid date differences
  const validTimeToCloseArray = timeToCloseArray.filter(time => time !== null);

  if (validTimeToCloseArray.length === 0) {
    console.error('No valid time differences found.');
    return null;
  }

  const timeToCloseInHoursArray = validTimeToCloseArray.map(time => ({
    timeDifference: (time.timeDifference / (1000 * 60 * 60)).toFixed(3),
    stageId: time.stageId, // Include assignedUserIds
    labelIds: time.labelIds,
    tagIds: time.tagIds
  }));

  return timeToCloseInHoursArray;
};

const calculateAverageTimeToCloseUser = tickets => {
  // Filter out tickets without close dates
  const closedTickets = tickets.filter(
    ticketItem => ticketItem.modifiedAt && ticketItem.createdAt
  );

  if (closedTickets.length === 0) {
    console.error('No closed tickets found.');
    return null;
  }

  // Calculate time to close for each ticket in milliseconds
  const timeToCloseArray = closedTickets.map(ticketItem => {
    const createdAt = new Date(ticketItem.createdAt).getTime();
    const modifiedAt = new Date(ticketItem.modifiedAt).getTime();

    // Check if both dates are valid
    if (!isNaN(createdAt) && !isNaN(modifiedAt)) {
      return {
        timeDifference: modifiedAt - createdAt,
        assignedUserIds: ticketItem.assignedUserIds // Include assignedUserIds
      };
    } else {
      console.error('Invalid date format for a ticket:', ticketItem);
      return null;
    }
  });

  // Filter out invalid date differences
  const validTimeToCloseArray = timeToCloseArray.filter(time => time !== null);

  if (validTimeToCloseArray.length === 0) {
    console.error('No valid time differences found.');
    return null;
  }

  const timeToCloseInHoursArray = validTimeToCloseArray.map(time => ({
    timeDifference: (time.timeDifference / (1000 * 60 * 60)).toFixed(3),
    assignedUserIds: time.assignedUserIds // Include assignedUserIds
  }));
  return timeToCloseInHoursArray;
};

function calculateDealsByLastModifiedDate(deals) {
  const dealsByDate = {};

  deals.forEach(deal => {
    const modifiedAt = new Date(deal.modifiedAt);
    const dealName = deal.name;

    if (dealName && !isNaN(modifiedAt.getTime())) {
      const formattedDate = modifiedAt.toLocaleDateString();
      dealsByDate[formattedDate] = dealsByDate[formattedDate] || [];
      dealsByDate[formattedDate].push({ name: dealName });
    }
  });

  // Sort keys (dates) in ascending order
  const sortedDates = Object.keys(dealsByDate).sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime()
  );

  // Create an array of objects with date and deals properties
  const result = sortedDates.map(date => ({
    date,
    deals: dealsByDate[date]
  }));

  return result;
}
