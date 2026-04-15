const fs = require('fs');
const filePath = 'client/src/pages/FieldTeamPortal.jsx';
let content = fs.readFileSync(filePath, 'utf8');

// Use a regex to find the problematic block and replace it correctly.
// We look for the "Impact Composition" Typography and then the messed up closing tags.
// Note: We use [\s\S]*? for non-greedy match of anything in between.

const regex = /<Typography variant="subtitle2" fontWeight="800" color="#fff" mb={2}>Impact Composition<\/Typography>[\s\S]*?}\)\(\)}/g;

const replacement = `<Typography variant="subtitle2" fontWeight="800" color="#fff" mb={2}>Impact Composition</Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1, gap: 4 }}>
                            <Box sx={{ width: 140, height: 140, flexShrink: 0 }}>
                              <ResponsiveContainer width="100%" height="100%">
                                <RechartsPieChart>
                                  <RechartsPie
                                    data={[
                                      { name: 'Detractors', value: fDetractors, fill: '#ef4444' },
                                      { name: 'Neutrals', value: fNeutrals, fill: '#f59e0b' },
                                      { name: 'Promoters', value: fPromoters, fill: '#10b981' }
                                    ].filter(d => d.value > 0)}
                                    innerRadius={45}
                                    outerRadius={65}
                                    dataKey="value"
                                    stroke="none"
                                  />
                                  <RechartsTooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: 8 }} itemStyle={{ fontSize: '0.8rem' }} />
                                </RechartsPieChart>
                              </ResponsiveContainer>
                            </Box>
                            <Box sx={{ flexGrow: 1 }}>
                              <Table size="small">
                                <TableBody>
                                  <TableRow>
                                    <TableCell sx={{ borderBottom: '1px solid rgba(255,255,255,0.05)', px: 0 }}><Typography variant="caption" color="#94a3b8">Detractors</Typography></TableCell>
                                    <TableCell sx={{ borderBottom: '1px solid rgba(255,255,255,0.05)', px: 0 }} align="right"><Typography variant="subtitle2" color="#ef4444" fontWeight="800">{fDetractors}</Typography></TableCell>
                                  </TableRow>
                                  <TableRow>
                                    <TableCell sx={{ borderBottom: '1px solid rgba(255,255,255,0.05)', px: 0 }}><Typography variant="caption" color="#94a3b8">Neutrals</Typography></TableCell>
                                    <TableCell sx={{ borderBottom: '1px solid rgba(255,255,255,0.05)', px: 0 }} align="right"><Typography variant="subtitle2" color="#f59e0b" fontWeight="800">{fNeutrals}</Typography></TableCell>
                                  </TableRow>
                                  <TableRow>
                                    <TableCell sx={{ borderBottom: 'none', px: 0 }}><Typography variant="caption" color="#94a3b8">Promoters</Typography></TableCell>
                                    <TableCell sx={{ borderBottom: 'none', px: 0 }} align="right"><Typography variant="subtitle2" color="#10b981" fontWeight="800">{fPromoters}</Typography></TableCell>
                                  </TableRow>
                                </TableBody>
                              </Table>
                            </Box>
                          </Box>
                        </Grid>
                      </Grid>
                    </Paper>
                  </Box>
                </Box>
              );
            })()}`;

if (regex.test(content)) {
    const newContent = content.replace(regex, replacement);
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log('Successfully fixed the code.');
} else {
    console.log('Regex did NOT match. Check the content again.');
}
