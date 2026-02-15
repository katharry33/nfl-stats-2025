/**
 * Manual Review Panel
 * Allows reviewing and editing prop data before formulas are applied
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Play, Save, X, Edit2, Check, AlertTriangle } from 'lucide-react';

interface PropData {
  id: string;
  player: string;
  team: string;
  prop: string;
  line: number;
  playerAvg?: number;
  opponentRank?: number;
  opponentAvgVsStat?: number;
  seasonHitPct?: number;
  odds?: number;
  hasOverrides?: boolean;
  overriddenFields?: string[];
}

interface Props {
  week: number;
  onResume: () => void;
}

export default function ManualReviewPanel({ week, onResume }: Props) {
  const [props, setProps] = useState<PropData[]>([]);
  const [editingProp, setEditingProp] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<PropData>>({});
  const [filterIssues, setFilterIssues] = useState(false);
  const [saving, setSaving] = useState(false);
  const [validationResults, setValidationResults] = useState<any>(null);

  useEffect(() => {
    loadPropsForReview();
    loadValidationResults();
  }, [week]);

  const loadPropsForReview = async () => {
    try {
      const response = await fetch(`/api/props-for-review?week=${week}`);
      const data = await response.json();
      setProps(data.props);
    } catch (error) {
      console.error('Failed to load props:', error);
    }
  };

  const loadValidationResults = async () => {
    try {
      const response = await fetch(`/api/validation-results?week=${week}`);
      const data = await response.json();
      setValidationResults(data);
    } catch (error) {
      console.error('Failed to load validation:', error);
    }
  };

  const startEdit = (prop: PropData) => {
    setEditingProp(prop.id);
    setEditValues({
      playerAvg: prop.playerAvg,
      opponentRank: prop.opponentRank,
      opponentAvgVsStat: prop.opponentAvgVsStat,
      seasonHitPct: prop.seasonHitPct,
      odds: prop.odds
    });
  };

  const cancelEdit = () => {
    setEditingProp(null);
    setEditValues({});
  };

  const saveEdit = async (propId: string) => {
    setSaving(true);
    try {
      const response = await fetch('/api/apply-manual-override', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propId,
          overrides: editValues,
          editedBy: 'user' // TODO: Get from auth context
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save override');
      }

      await loadPropsForReview();
      setEditingProp(null);
      setEditValues({});
    } catch (error) {
      console.error('Error saving:', error);
    } finally {
      setSaving(false);
    }
  };

  const hasIssues = (prop: PropData): boolean => {
    return (
      !prop.playerAvg ||
      !prop.opponentRank ||
      !prop.opponentAvgVsStat ||
      prop.opponentRank < 1 ||
      prop.opponentRank > 32
    );
  };

  const filteredProps = filterIssues
    ? props.filter(hasIssues)
    : props;

  const issueCount = props.filter(hasIssues).length;

  return (
    <div className="space-y-6">
      {/* Validation Summary */}
      {validationResults && (
        <Alert variant={validationResults.passed ? 'default' : 'destructive'}>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Validation Results:</strong>
            <div className="mt-2 text-sm">
              • {validationResults.stats.validProps}/{validationResults.stats.totalProps} props valid
              <br />
              • {validationResults.errors.length} errors found
              <br />
              • {validationResults.warnings.length} warnings
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Controls */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Manual Review - Week {week}</CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilterIssues(!filterIssues)}
              >
                {filterIssues ? 'Show All' : `Show Issues Only (${issueCount})`}
              </Button>
              <Button
                onClick={onResume}
                className="bg-green-600 hover:bg-green-700"
              >
                <Play className="mr-2 h-4 w-4" />
                Continue Pipeline
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Props Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Player
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Prop
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Line
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Player Avg
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Opp Rank
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Opp Avg
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredProps.map((prop) => {
                  const isEditing = editingProp === prop.id;
                  const propHasIssues = hasIssues(prop);

                  return (
                    <tr
                      key={prop.id}
                      className={`${
                        propHasIssues ? 'bg-red-50' : ''
                      } ${prop.hasOverrides ? 'bg-blue-50' : ''}`}
                    >
                      <td className="px-4 py-3">
                        <div>
                          <div className="font-medium text-sm">
                            {prop.player}
                          </div>
                          <div className="text-xs text-gray-500">
                            {prop.team}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">{prop.prop}</td>
                      <td className="px-4 py-3 text-sm">{prop.line}</td>
                      
                      {/* Player Avg */}
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <Input
                            type="number"
                            step="0.1"
                            value={editValues.playerAvg || ''}
                            onChange={(e) =>
                              setEditValues({
                                ...editValues,
                                playerAvg: parseFloat(e.target.value)
                              })
                            }
                            className="w-20"
                          />
                        ) : (
                          <span className="text-sm">
                            {prop.playerAvg?.toFixed(1) || '—'}
                          </span>
                        )}
                      </td>
                      
                      {/* Opp Rank */}
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <Input
                            type="number"
                            value={editValues.opponentRank || ''}
                            onChange={(e) =>
                              setEditValues({
                                ...editValues,
                                opponentRank: parseInt(e.target.value)
                              })
                            }
                            className="w-16"
                          />
                        ) : (
                          <span
                            className={`text-sm ${
                              prop.opponentRank && (prop.opponentRank < 1 || prop.opponentRank > 32)
                                ? 'text-red-600 font-bold'
                                : ''
                            }`}
                          >
                            {prop.opponentRank || '—'}
                          </span>
                        )}
                      </td>
                      
                      {/* Opp Avg */}
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <Input
                            type="number"
                            step="0.1"
                            value={editValues.opponentAvgVsStat || ''}
                            onChange={(e) =>
                              setEditValues({
                                ...editValues,
                                opponentAvgVsStat: parseFloat(e.target.value)
                              })
                            }
                            className="w-20"
                          />
                        ) : (
                          <span className="text-sm">
                            {prop.opponentAvgVsStat?.toFixed(1) || '—'}
                          </span>
                        )}
                      </td>
                      
                      {/* Actions */}
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => saveEdit(prop.id)}
                              disabled={saving}
                            >
                              <Check className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={cancelEdit}
                            >
                              <X className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex gap-2 items-center">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => startEdit(prop)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            {prop.hasOverrides && (
                              <Badge variant="secondary" className="text-xs">
                                Edited
                              </Badge>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold">{props.length}</div>
              <div className="text-sm text-gray-500">Total Props</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-red-600">{issueCount}</div>
              <div className="text-sm text-gray-500">Props with Issues</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">
                {props.filter(p => p.hasOverrides).length}
              </div>
              <div className="text-sm text-gray-500">Manual Overrides</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}