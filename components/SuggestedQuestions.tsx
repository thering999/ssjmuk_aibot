import React, { memo } from 'react';
import { useTranslation } from '../hooks/useTranslation';

interface SuggestedQuestionsProps {
  onQuestionClick: (question: string) => void;
}

const SuggestedQuestions: React.FC<SuggestedQuestionsProps> = ({ onQuestionClick }) => {
  const { t } = useTranslation();
  const questions = t('suggestedQuestions', { returnObjects: true }) as string[];

  return (
    <div className="mb-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {questions.map((q, i) => (
          <button
            key={i}
            onClick={() => onQuestionClick(q)}
            className="text-left p-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 transition-colors"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
};

export default memo(SuggestedQuestions);