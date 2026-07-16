from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from django.utils import timezone
from django.db.models import Q, Avg
from rest_framework import generics, status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from companies.models import Company, Industry
from reports.models import (
    Questionnaire, Question, Report, Answer,
    ReportingPeriod, ReportStatus,
)
from accounts.models import (
    PasswordResetToken)
from .serializers import (
    UserSerializer, UserListSerializer, RegisterSerializer,
    CompanySerializer, CompanyWriteSerializer,
    QuestionnaireSerializer, QuestionnaireListSerializer, QuestionSerializer,
    ReportSerializer, ReportCreateSerializer, AnswerSerializer,
    ReportingPeriodSerializer,
)

User = get_user_model()

class IsAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.is_admin


class IsAdminOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return request.user.is_authenticated
        return request.user.is_authenticated and request.user.is_admin


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email', '').strip()
        password = request.data.get('password', '')

        if not email or not password:
            return Response({'detail': 'Email and password required.'}, status=400)

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({'detail': 'Invalid credentials.'}, status=401)

        if not user.check_password(password):
            return Response({'detail': 'Invalid credentials.'}, status=401)

        if not user.is_active:
            return Response({'detail': 'Account is blocked.'}, status=403)

        user.last_login = timezone.now()
        user.save(update_fields=['last_login'])

        refresh = RefreshToken.for_user(user)
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': UserSerializer(user).data,
        })


class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)

        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': UserSerializer(user).data,
        }, status=201)


class MeView(APIView):
    def get(self, request):
        return Response(UserSerializer(request.user).data)

class LogoutView(APIView):
    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
        except Exception:
            pass
        return Response({'detail': 'Logged out.'})


class PasswordResetRequestView(APIView):
    """
    POST /auth/password-reset/
    Body: { "email": "user@example.com" }

    Создаёт токен и отправляет письмо.
    Всегда возвращает 200 (не раскрываем, есть ли такой email).
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        if email:
            try:
                user = User.objects.get(email=email, is_active=True)
                PasswordResetToken.objects.filter(user=user, used=False).update(used=True)
                token_obj = PasswordResetToken.objects.create(user=user)

                reset_url = (
                    request.data.get('reset_url', 'http://localhost:3000/reset-password')
                    + f'?token={token_obj.token}'
                )
                send_mail(
                    subject='Восстановление пароля ESG Platform',
                    message=(
                        f'Здравствуйте, {user.get_full_name() or user.email}!\n\n'
                        f'Для сброса пароля перейдите по ссылке:\n{reset_url}\n\n'
                        f'Ссылка действительна {PasswordResetToken.EXPIRY_HOURS} часов.\n'
                        f'Если вы не запрашивали сброс — проигнорируйте это письмо.'
                    ),
                    from_email=None, 
                    recipient_list=[user.email],
                    fail_silently=True,
                )
            except User.DoesNotExist:
                pass   # намеренно: не раскрываем наличие email

        return Response({'detail': 'If the email is registered, a reset link has been sent.'})


class PasswordResetConfirmView(APIView):
    """
    POST /auth/password-reset/confirm/
    Body: { "token": "<uuid>", "password": "newpass123" }
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        raw_token = request.data.get('token', '').strip()
        new_password = request.data.get('password', '')

        if not raw_token or not new_password:
            return Response({'detail': 'token and password are required.'}, status=400)
        if len(new_password) < 6:
            return Response({'detail': 'Password must be at least 6 characters.'}, status=400)

        try:
            token_obj = PasswordResetToken.objects.select_related('user').get(token=raw_token)
        except (PasswordResetToken.DoesNotExist, ValueError):
            return Response({'detail': 'Invalid or expired token.'}, status=400)

        if not token_obj.is_valid():
            return Response({'detail': 'Invalid or expired token.'}, status=400)

        user = token_obj.user
        user.set_password(new_password)
        user.save()
        token_obj.used = True
        token_obj.save(update_fields=['used'])

        return Response({'detail': 'Password has been reset successfully.'})


class UserListView(generics.ListAPIView):
    serializer_class = UserListSerializer
    permission_classes = [IsAdmin]

    def get_queryset(self):
        return User.objects.select_related('company').order_by('-date_joined')


class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = User.objects.all()
    serializer_class = UserListSerializer
    permission_classes = [IsAdmin]


class UserToggleBlockView(APIView):
    permission_classes = [IsAdmin]

    def post(self, request, pk):
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=404)
        user.is_active = not user.is_active
        user.save(update_fields=['is_active'])
        return Response({'id': user.id, 'isBlocked': not user.is_active})


class UserResetPasswordView(APIView):
    permission_classes = [IsAdmin]

    def post(self, request, pk):
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=404)
        new_password = request.data.get('password')
        if not new_password or len(new_password) < 6:
            return Response({'detail': 'Password must be at least 6 characters.'}, status=400)
        user.set_password(new_password)
        user.save()
        return Response({'detail': 'Password reset successfully.'})


class CompanyListView(generics.ListCreateAPIView):
    permission_classes = [IsAdminOrReadOnly]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return CompanyWriteSerializer
        return CompanySerializer

    def get_queryset(self):
        return Company.objects.filter(is_active=True).order_by('name')

    def create(self, request, *args, **kwargs):
        serializer = CompanyWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        company = serializer.save()
        return Response(CompanySerializer(company).data, status=201)


class CompanyDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Company.objects.all()
    permission_classes = [IsAdminOrReadOnly]

    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return CompanyWriteSerializer
        return CompanySerializer


class QuestionnaireListView(APIView):
    """
    GET список всех активных опросников
    POST создание нового опросника с вопросами (только admin)

    POST body:
    {
        "title": "...",
        "description": "...",
        "year": 2026,
        "is_active": true,
        "questions": [
            {
                "category": "E",           // E | S | G
                "text": "...",
                "question_type": "choice", // text|number|choice|multi_choice|scale|boolean
                "options": ["A", "B"],     // для choice/multi_choice
                "max_score": 10.0,
                "weight": 1.0,
                "is_required": true
            }, ...
        ]
    }
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        qs = Questionnaire.objects.filter(is_active=True).order_by('-year')
        return Response(QuestionnaireListSerializer(qs, many=True).data)

    def post(self, request):
        if not request.user.is_admin:
            return Response({'detail': 'Forbidden.'}, status=403)
        data = request.data
        questionnaire = Questionnaire.objects.create(
            title=data.get('title', ''),
            description=data.get('description', ''),
            year=data.get('year', timezone.now().year),
            is_active=data.get('is_active', True),
            weight_e=data.get('weight_e', 1.0),
            weight_s=data.get('weight_s', 1.0),
            weight_g=data.get('weight_g', 1.0),
        )
        for i, q in enumerate(data.get('questions', [])):
            Question.objects.create(
                questionnaire=questionnaire,
                order=q.get('order', i),
                category=q.get('category', 'E'),
                text=q.get('text', ''),
                question_type=q.get('question_type', 'text'),
                options=q.get('options', []),
                max_score=q.get('max_score', 10.0),
                weight=q.get('weight', 1.0),
                is_required=q.get('is_required', True),
                score_formula=q.get('score_formula', ''),
                scale_max=q.get('scale_max', 5),
            )
        return Response(QuestionnaireSerializer(questionnaire).data, status=201)


class QuestionnaireDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        try:
            obj = Questionnaire.objects.prefetch_related('questions').get(pk=pk)
        except Questionnaire.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=404)
        return Response(QuestionnaireSerializer(obj).data)

    def put(self, request, pk):
        return self._update(request, pk)

    def patch(self, request, pk):
        return self._update(request, pk)

    def _update(self, request, pk):
        if not request.user.is_admin:
            return Response({'detail': 'Forbidden.'}, status=403)
        try:
            obj = Questionnaire.objects.get(pk=pk)
        except Questionnaire.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=404)

        data = request.data
        for field in ['title', 'description', 'year', 'is_active',
                      'weight_e', 'weight_s', 'weight_g']:
            if field in data:
                setattr(obj, field, data[field])
        obj.save()

        if 'questions' in data:
            obj.questions.all().delete()
            for i, q in enumerate(data['questions']):
                Question.objects.create(
                    questionnaire=obj,
                    order=q.get('order', i),
                    category=q.get('category', 'E'),
                    text=q.get('text', ''),
                    question_type=q.get('question_type', 'text'),
                    options=q.get('options', []),
                    max_score=q.get('max_score', 10.0),
                    weight=q.get('weight', 1.0),
                    is_required=q.get('is_required', True),
                    score_formula=q.get('score_formula', ''),
                    scale_max=q.get('scale_max', 5),
                )

        obj.refresh_from_db()
        return Response(QuestionnaireSerializer(obj).data)

    def delete(self, request, pk):
        if not request.user.is_admin:
            return Response({'detail': 'Forbidden.'}, status=403)
        try:
            obj = Questionnaire.objects.get(pk=pk)
        except Questionnaire.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=404)
        if Report.objects.filter(questionnaire=obj).exists():
            return Response({'detail': 'Cannot delete: questionnaire has linked reports.'}, status=400)
        obj.delete()
        return Response(status=204)


class QuestionDetailView(APIView):
    permission_classes = [IsAdmin]

    def patch(self, request, pk):
        try:
            question = Question.objects.get(pk=pk)
        except Question.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=404)

        allowed = ['category', 'text', 'question_type', 'options',
                      'max_score', 'weight', 'order', 'is_required',
                      'score_formula', 'scale_max']
        for field in allowed:
            if field in request.data:
                setattr(question, field, request.data[field])
        question.save()
        return Response(QuestionSerializer(question).data)

    def delete(self, request, pk):
        try:
            question = Question.objects.get(pk=pk)
        except Question.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=404)
        question.delete()
        return Response(status=204)


class QuestionnaireAddQuestionView(APIView):
    permission_classes = [IsAdmin]

    def post(self, request, pk):
        try:
            questionnaire = Questionnaire.objects.get(pk=pk)
        except Questionnaire.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=404)

        last_order = questionnaire.questions.count()
        question = Question.objects.create(
            questionnaire=questionnaire,
            order=request.data.get('order', last_order),
            category=request.data.get('category', 'E'),
            text=request.data.get('text', ''),
            question_type=request.data.get('question_type', 'text'),
            options=request.data.get('options', []),
            max_score=request.data.get('max_score', 10.0),
            weight=request.data.get('weight', 1.0),
            is_required=request.data.get('is_required', True),
            score_formula=request.data.get('score_formula', ''),
            scale_max=request.data.get('scale_max', 5),
        )
        return Response(QuestionSerializer(question).data, status=201)


class ReportListView(APIView):
    """
    GET  — список отчётов с фильтрами:
        ?company=<id>
        ?period=<id>
        ?industry=<key>   (education|construction|chemical|...)
        ?region=<key>     (almaty_city|astana|...)
        ?score_min=<float>
        ?score_max=<float>
        ?search=<string>  (полнотекстовый поиск по компании, респонденту, опроснику, периоду)
    POST — создать новый отчёт (черновик)
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        if user.is_admin:
            qs = Report.objects.select_related(
                'company', 'respondent', 'period', 'questionnaire'
            ).order_by('-created_at')
        elif user.is_respondent:
            qs = Report.objects.filter(respondent=user).select_related(
                'company', 'period', 'questionnaire'
            ).order_by('-created_at')
        else:
            qs = Report.objects.filter(status='submitted').select_related(
                'company', 'respondent', 'period', 'questionnaire'
            ).order_by('-submitted_at')

        p = request.query_params
        if p.get('company'):
            qs = qs.filter(company_id=p['company'])
        if p.get('period'):
            qs = qs.filter(period_id=p['period'])
        if p.get('industry'):
            qs = qs.filter(company__industry=p['industry'])
        if p.get('region'):
            qs = qs.filter(company__region=p['region'])
        if p.get('score_min'):
            try:
                qs = qs.filter(total_score__gte=float(p['score_min']))
            except ValueError:
                pass
        if p.get('score_max'):
            try:
                qs = qs.filter(total_score__lte=float(p['score_max']))
            except ValueError:
                pass
        if p.get('search', '').strip():
            s = p['search'].strip()
            qs = qs.filter(
                Q(company__name__icontains=s) |
                Q(respondent__first_name__icontains=s) |
                Q(respondent__last_name__icontains=s) |
                Q(respondent__email__icontains=s) |
                Q(questionnaire__title__icontains=s) |
                Q(period__name__icontains=s)
            )

        return Response(ReportSerializer(qs, many=True).data)

    def post(self, request):
        if not request.user.is_respondent and not request.user.is_admin:
            return Response({'detail': 'Only respondents can create reports.'}, status=403)
        serializer = ReportCreateSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        return Response(ReportSerializer(serializer.save()).data, status=201)


class ReportDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ReportSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_admin:
            return Report.objects.all()
        elif user.is_respondent:
            return Report.objects.filter(respondent=user)
        return Report.objects.filter(status='submitted')


class ReportSubmitView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            report = Report.objects.get(pk=pk, respondent=request.user)
        except Report.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=404)

        if report.status != 'draft':
            return Response({'detail': 'Only draft reports can be submitted.'}, status=400)

        report.status = ReportStatus.SUBMITTED
        report.submitted_at = timezone.now()
        report.save(update_fields=['status', 'submitted_at'])
        report.calculate_scores()
        return Response(ReportSerializer(report).data)


class ReportReviewView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        if not request.user.is_admin:
            return Response({'detail': 'Only admins can review reports.'}, status=403)
        try:
            report = Report.objects.get(pk=pk)
        except Report.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=404)
        if report.status != 'submitted':
            return Response({'detail': 'Only submitted reports can be reviewed.'}, status=400)
        report.status = ReportStatus.REVIEWED
        report.save(update_fields=['status'])
        return Response(ReportSerializer(report).data)
    

class ReportAnswersView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        try:
            report = Report.objects.get(pk=pk)
        except Report.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=404)

        # Viewer может читать только отправленные отчёты
        if request.user.is_viewer and report.status != 'submitted':
            return Response({'detail': 'Forbidden.'}, status=403)

        answers = report.answers.select_related('question').all()
        return Response(AnswerSerializer(answers, many=True).data)

    def post(self, request, pk):
        try:
            report = Report.objects.get(pk=pk, respondent=request.user)
        except Report.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=404)

        if report.status != 'draft':
            return Response({'detail': 'Cannot edit a submitted report.'}, status=400)

        answers_data = request.data if isinstance(request.data, list) else [request.data]
        saved = []

        for item in answers_data:
            question_id = item.get('question')
            if not question_id:
                continue

            try:
                question = Question.objects.get(pk=question_id)
            except Question.DoesNotExist:
                continue

            score = item.get('score')
            if score is None:
                score = self._calculate_score(question, item)

            answer, _ = Answer.objects.update_or_create(
                report=report,
                question_id=question_id,
                defaults={
                    'text_value': item.get('text_value', ''),
                    'number_value': item.get('number_value'),
                    'choice_value': item.get('choice_value', []),
                    'score': score,
                }
            )
            saved.append(answer)

        report.updated_at = timezone.now()
        report.save(update_fields=['updated_at'])
        return Response(AnswerSerializer(saved, many=True).data)

    @staticmethod
    def _calculate_score(question, item):
        """
        Автоматический расчёт балла по типу вопроса.
        Правило: равномерное распределение max_score по вариантам.
        Для scale: (value / max_scale) * max_score
        Для number: min(number_value, max_score)
        Для text/boolean: max_score если есть ответ, иначе 0
        """
        qtype = question.question_type
        max_score = question.max_score

        if qtype == 'scale':
            val = item.get('number_value')
            if val is not None:
                return round((float(val) / 5.0) * max_score, 2)

        elif qtype in ('choice', 'boolean'):
            text_val = item.get('text_value', '')
            options = question.options or []
            if qtype == 'boolean':
                options = ['yes', 'да', 'true', '1']
                if text_val.lower() in options:
                    return max_score
                return 0.0
            if options and text_val in options:
                idx = options.index(text_val)
                if len(options) == 1:
                    return max_score
                return round(max_score * (1 - idx / (len(options) - 1)), 2)

        elif qtype == 'multi_choice':
            chosen = item.get('choice_value', [])
            options = question.options or []
            if options and chosen:
                return round((len(chosen) / len(options)) * max_score, 2)

        elif qtype == 'number':
            val = item.get('number_value')
            if val is not None:
                return round(min(float(val), max_score), 2)

        elif qtype == 'text':
            text_val = item.get('text_value', '')
            return max_score if text_val.strip() else 0.0

        return None


class DashboardStatsView(APIView):
    """
    GET /dashboard/stats/

    Возвращает данные в зависимости от роли:

    Admin:
        totalUsers, totalCompanies, totalReports, submittedReports, avgEsgScore

    Respondent:
        totalReports, submittedReports, draftReports,
        latestScore, latestEScore, latestSScore, latestGScore,
        trendData        — [{ period, e, s, g, total }, ...] последние 5 отчётов
        industryAvg      — средний балл по отрасли (float | null)
        problemZones     — [{ question, category, score, maxScore, percent }, ...]

    Viewer:
        totalSubmittedReports, avgEsgScore, totalCompanies,
        companyRankings  — топ-20 компаний [{ id, name, industry, region, avgScore, eScore, sScore, gScore, reportCount }]
        industryStats    — [{ industry, e, s, g, total }]
        scoreDistribution — [{ range, count }]
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if request.user.is_admin:
            return self._admin_stats()
        if request.user.is_respondent:
            return self._respondent_stats(request.user)
        return self._viewer_stats(request)

    def _admin_stats(self):
        scores = list(
            Report.objects.filter(total_score__isnull=False)
            .values_list('total_score', flat=True)
        )
        return Response({
            'totalUsers':       User.objects.count(),
            'totalCompanies':   Company.objects.filter(is_active=True).count(),
            'totalReports':     Report.objects.count(),
            'submittedReports': Report.objects.filter(status='submitted').count(),
            'avgEsgScore':      round(sum(scores) / len(scores), 1) if scores else None,
        })

    def _respondent_stats(self, user):
        my_reports = Report.objects.filter(respondent=user)
        submitted  = my_reports.filter(status='submitted')
        latest     = submitted.order_by('-submitted_at').first()

        trend_data = [
            {
                'period': r.period.name if r.period else f'#{r.id}',
                'e':      r.score_e,
                's':      r.score_s,
                'g':      r.score_g,
                'total':  r.total_score,
            }
            for r in submitted.filter(total_score__isnull=False)
                              .order_by('submitted_at')
                              .select_related('period')
        ]

        industry_avg = None
        if latest and latest.company:
            agg = (
                Report.objects
                .filter(company__industry=latest.company.industry,
                        status='submitted', total_score__isnull=False)
                .exclude(respondent=user)
                .aggregate(avg=Avg('total_score'))
            )
            if agg['avg'] is not None:
                industry_avg = round(agg['avg'], 1)

        problem_zones = []
        if latest:
            low = (
                Answer.objects
                .filter(report=latest, score__isnull=False, question__max_score__gt=0)
                .select_related('question')
                .order_by('score')[:5]
            )
            for a in low:
                problem_zones.append({
                    'question': a.question.text[:100],
                    'category': a.question.category,
                    'score':    a.score,
                    'maxScore': a.question.max_score,
                    'percent':  round((a.score / a.question.max_score) * 100, 1),
                })

        return Response({
            'totalReports':     my_reports.count(),
            'submittedReports': submitted.count(),
            'draftReports':     my_reports.filter(status='draft').count(),
            'latestScore':      latest.total_score if latest else None,
            'latestEScore':     latest.score_e     if latest else None,
            'latestSScore':     latest.score_s     if latest else None,
            'latestGScore':     latest.score_g     if latest else None,
            'trendData':        trend_data,
            'industryAvg':      industry_avg,
            'problemZones':     problem_zones,
        })

    def _viewer_stats(self, request):
        p = request.query_params
        submitted = Report.objects.filter(status='submitted')

        if p.get('period'):
            submitted = submitted.filter(period_id=p['period'])

        scores = list(
            submitted.filter(total_score__isnull=False)
            .values_list('total_score', flat=True)
        )
        avg_score = round(sum(scores) / len(scores), 1) if scores else None

        companies_qs = Company.objects.filter(is_active=True)
        if p.get('industry'):
            companies_qs = companies_qs.filter(industry=p['industry'])
        if p.get('region'):
            companies_qs = companies_qs.filter(region=p['region'])

        company_rankings = []
        for company in companies_qs:
            co_rep = submitted.filter(company=company, total_score__isnull=False)
            if not co_rep.exists():
                continue
            agg     = co_rep.aggregate(avg=Avg('total_score'))
            latest  = co_rep.order_by('-submitted_at').first()
            company_rankings.append({
                'id':          company.id,
                'name':        company.name,
                'industry':    company.industry,
                'region':      company.region,
                'avgScore':    round(agg['avg'], 1) if agg['avg'] else None,
                'eScore':      latest.score_e if latest else None,
                'sScore':      latest.score_s if latest else None,
                'gScore':      latest.score_g if latest else None,
                'reportCount': co_rep.count(),
            })
        company_rankings.sort(key=lambda x: x['avgScore'] or 0, reverse=True)

        industry_stats = []
        for ind_key, ind_label in Industry.choices:
            ind_rep = submitted.filter(company__industry=ind_key, total_score__isnull=False)
            if not ind_rep.exists():
                continue
            agg = ind_rep.aggregate(
                avg_e=Avg('score_e'), avg_s=Avg('score_s'),
                avg_g=Avg('score_g'), avg_t=Avg('total_score'),
            )
            industry_stats.append({
                'industry':    ind_label,
                'industryKey': ind_key,
                'e':     round(agg['avg_e'], 1) if agg['avg_e'] else 0,
                's':     round(agg['avg_s'], 1) if agg['avg_s'] else 0,
                'g':     round(agg['avg_g'], 1) if agg['avg_g'] else 0,
                'total': round(agg['avg_t'], 1) if agg['avg_t'] else 0,
            })

        score_distribution = [
            {'range': '0–25',   'count': sum(1 for s in scores if s <= 25)},
            {'range': '26–50',  'count': sum(1 for s in scores if 25 < s <= 50)},
            {'range': '51–75',  'count': sum(1 for s in scores if 50 < s <= 75)},
            {'range': '76–100', 'count': sum(1 for s in scores if s > 75)},
        ]

        return Response({
            'totalSubmittedReports': submitted.count(),
            'avgEsgScore':           avg_score,
            'totalCompanies':        Company.objects.filter(is_active=True).count(),
            'companyRankings':       company_rankings[:20],
            'industryStats':         industry_stats,
            'scoreDistribution':     score_distribution,
        })


class ReportingPeriodListView(generics.ListCreateAPIView):
    serializer_class = ReportingPeriodSerializer
    permission_classes = [IsAdminOrReadOnly]

    def get_queryset(self):
        return ReportingPeriod.objects.filter(is_active=True).order_by('-year', '-quarter')
