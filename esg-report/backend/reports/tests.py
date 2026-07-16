from django.test import TestCase
from django.utils import timezone
from accounts.models import User, Role
from companies.models import Company
from reports.models import (
    Questionnaire, Question, ReportingPeriod,
    Report, ReportStatus, QuestionType, ScoreFormula
)

class ScoringFormulaTests(TestCase):

    def make_question(self, q_type, formula='', options=None, max_score=10.0, scale_max=5):
        q = Question()
        q.question_type = q_type
        q.score_formula = formula
        q.options = options or []
        q.max_score = max_score
        q.scale_max = scale_max
        q.weight = 1.0
        return q

    def test_linear_desc(self):
        q = self.make_question(QuestionType.CHOICE, ScoreFormula.LINEAR_DESC, options=['A', 'B', 'C'])
        self.assertEqual(q.calculate_answer_score(text_value='A'), 10.0)
        self.assertEqual(q.calculate_answer_score(text_value='C'), 0.0)

    def test_linear_asc(self):
        q = self.make_question(QuestionType.CHOICE, ScoreFormula.LINEAR_ASC, options=['A', 'B', 'C'])
        self.assertEqual(q.calculate_answer_score(text_value='A'), 0.0)
        self.assertEqual(q.calculate_answer_score(text_value='C'), 10.0)

    def test_binary_boolean_yes(self):
        q = self.make_question(QuestionType.BOOLEAN, ScoreFormula.BINARY)
        self.assertEqual(q.calculate_answer_score(text_value='yes'), 10.0)
        self.assertEqual(q.calculate_answer_score(text_value='no'), 0.0)

    def test_binary_text(self):
        q = self.make_question(QuestionType.TEXT, ScoreFormula.BINARY)
        self.assertEqual(q.calculate_answer_score(text_value='some text'), 10.0)
        self.assertEqual(q.calculate_answer_score(text_value=''), 0.0)

    def test_proportional(self):
        q = self.make_question(QuestionType.MULTI_CHOICE, ScoreFormula.PROPORTIONAL, options=['A', 'B', 'C', 'D'])
        self.assertEqual(q.calculate_answer_score(choice_value=['A', 'B']), 5.0)
        self.assertEqual(q.calculate_answer_score(choice_value=['A', 'B', 'C', 'D']), 10.0)

    def test_scale_linear(self):
        q = self.make_question(QuestionType.SCALE, ScoreFormula.SCALE_LINEAR, scale_max=5)
        self.assertEqual(q.calculate_answer_score(number_value=5), 10.0)
        self.assertEqual(q.calculate_answer_score(number_value=0), 0.0)

    def test_numeric_cap(self):
        q = self.make_question(QuestionType.NUMBER, ScoreFormula.NUMERIC_CAP, max_score=10.0)
        self.assertEqual(q.calculate_answer_score(number_value=7), 7.0)
        self.assertEqual(q.calculate_answer_score(number_value=15), 10.0)


class ReportFlowTests(TestCase):

    def setUp(self):
        self.admin = User.objects.create_user(
            email='admin@test.com', password='test123',
            first_name='Admin', last_name='User', role=Role.ADMIN
        )
        self.respondent = User.objects.create_user(
            email='resp@test.com', password='test123',
            first_name='Test', last_name='Resp', role=Role.RESPONDENT
        )
        self.company = Company.objects.create(name='Test Company', industry='energy', region='almaty')
        self.questionnaire = Questionnaire.objects.create(title='Test Q', year=2026)
        self.question = Question.objects.create(
            questionnaire=self.questionnaire,
            category='E', text='Test question',
            question_type=QuestionType.BOOLEAN,
            score_formula=ScoreFormula.BINARY,
            max_score=10.0, weight=1.0
        )
        self.period = ReportingPeriod.objects.create(
            name='Q1 2026', year=2026, quarter=1,
            start_date='2026-01-01', end_date='2026-03-31'
        )

    def test_report_created_as_draft(self):
        report = Report.objects.create(
            respondent=self.respondent,
            company=self.company,
            questionnaire=self.questionnaire,
            period=self.period
        )
        self.assertEqual(report.status, ReportStatus.DRAFT)

    def test_report_submit(self):
        report = Report.objects.create(
            respondent=self.respondent,
            company=self.company,
            questionnaire=self.questionnaire,
            period=self.period
        )
        report.status = ReportStatus.SUBMITTED
        report.submitted_at = timezone.now()
        report.save()
        self.assertEqual(report.status, ReportStatus.SUBMITTED)
        self.assertIsNotNone(report.submitted_at)

    def test_report_review(self):
        report = Report.objects.create(
            respondent=self.respondent,
            company=self.company,
            questionnaire=self.questionnaire,
            period=self.period,
            status=ReportStatus.SUBMITTED
        )
        report.status = ReportStatus.REVIEWED
        report.save()
        self.assertEqual(report.status, ReportStatus.REVIEWED)