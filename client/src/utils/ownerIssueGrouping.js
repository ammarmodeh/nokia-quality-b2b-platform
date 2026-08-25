export const normalizeArrayField = (value) => {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value
      .flatMap((item) => (typeof item === 'string' ? item.split(',').map((part) => part.trim()) : [item]))
      .map((item) => String(item).trim())
      .filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);
  }

  return [String(value).trim()].filter(Boolean);
};

export const buildOwnerIssueRows = (task, owner) => {
  if (!task || !owner) return [];

  const ownerKey = String(owner).trim().toUpperCase();
  const responsibleValues = normalizeArrayField(task.responsible);

  if (!responsibleValues.length) {
    const taskOwner = String(task.responsible || '').trim().toUpperCase();
    if (!taskOwner || taskOwner !== ownerKey) return [];
  }

  const matchingIndexes = responsibleValues
    .map((value, index) => ({ value, index }))
    .filter(({ value }) => value.toUpperCase() === ownerKey)
    .map(({ index }) => index);

  if (!matchingIndexes.length) {
    return [];
  }

  const fieldNames = ['reason', 'subReason', 'rootCause', 'teamAccountability', 'itnRelated', 'relatedToSubscription', 'responsible'];
  const baseRow = { ...task };

  return matchingIndexes.map((index) => {
    const row = { ...baseRow };

    fieldNames.forEach((field) => {
      const values = normalizeArrayField(task[field]);
      const value = values[index] ?? values[0] ?? 'N/A';

      if (field === 'responsible') {
        row[field] = ownerKey;
        return;
      }

      row[field] = value;
    });

    return row;
  });
};
