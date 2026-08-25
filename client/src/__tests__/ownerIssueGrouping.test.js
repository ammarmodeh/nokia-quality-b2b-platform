import { describe, expect, it } from 'vitest';
import { buildOwnerIssueRows } from '../utils/ownerIssueGrouping';

describe('buildOwnerIssueRows', () => {
  it('keeps only rows that match the requested owner when a task has multi-owner issue arrays', () => {
    const task = {
      slid: 'ABC123',
      responsible: ['REACH', 'OJO'],
      reason: ['Sales & Services', 'QoS'],
      subReason: ['Service not working', 'Network outage'],
      rootCause: ['Unfulfilled promise', 'ONT SW glitch'],
      teamAccountability: ['No', 'Yes'],
      evaluationScore: 5,
      customerFeedback: 'Test comment',
      priority: 'High'
    };

    const ownerRows = buildOwnerIssueRows(task, 'OJO');

    expect(ownerRows).toHaveLength(1);
    expect(ownerRows[0].responsible).toBe('OJO');
    expect(ownerRows[0].reason).toBe('QoS');
    expect(ownerRows[0].rootCause).toBe('ONT SW glitch');
    expect(ownerRows[0].teamAccountability).toBe('Yes');
  });

  it('returns empty when the task does not belong to the requested owner', () => {
    const task = {
      responsible: ['REACH'],
      reason: ['Sales & Services'],
      subReason: ['Service not working'],
      rootCause: ['Unfulfilled promise'],
      teamAccountability: ['No']
    };

    expect(buildOwnerIssueRows(task, 'OJO')).toEqual([]);
  });
});
