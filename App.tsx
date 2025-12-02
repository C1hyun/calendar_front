import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';

const API_BASE_URL = 'http://192.168.200.105:3000';
const DEFAULT_USER_ID = 1;

interface Task {
  id: string;
  title: string;
  period: string;
  content: string;
  dDay: string;
}

interface Todo {
  todoId: number;
  userId?: number;
  title: string;
  content: string | null;
  startDate: string;
  endDate: string;
  completed: boolean;
  createdAt?: string;
  completedAt?: string | null;
}

interface Schedule {
  scheduleId: number;
  userId?: number;
  week: 'Mon' | 'Tue' | 'Wen' | 'Thu' | 'Fri' | 'Sat' | 'Sun';
  startTime: number;
  endTime: number;
  title: string;
  content: string | null;
  color: string;
  createdAt?: string;
  updatedAt?: string;
}

type TabType = '과제' | '할 일' | '달력' | '시간표';

const formatPeriod = (start: string, end: string) => `${start} ~ ${end}`;

const formatDDay = (end: string) => {
  const today = new Date();
  const target = new Date(end);
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);

  const diff =
    Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diff > 0) {
    return `D-${diff}`;
  }
  if (diff === 0) {
    return 'D-Day';
  }
  return `D+${Math.abs(diff)}`;
};

const padNumber = (value: number) => String(value).padStart(2, '0');
const dateKeyFromParts = (year: number, monthIndex: number, day: number) =>
  `${year}-${padNumber(monthIndex + 1)}-${padNumber(day)}`;

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpName, setSignUpName] = useState('');
  const [signUpBirthDate, setSignUpBirthDate] = useState('');
  const [signUpBirthDatePickerDate, setSignUpBirthDatePickerDate] =
    useState<Date | null>(null);
  const [showSignUpBirthPicker, setShowSignUpBirthPicker] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [startDatePickerDate, setStartDatePickerDate] =
    useState<Date | null>(null);
  const [endDatePickerDate, setEndDatePickerDate] =
    useState<Date | null>(null);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('과제');
  const [todos, setTodos] = useState<Todo[]>([]);
  const [isAddingTodo, setIsAddingTodo] = useState(false);
  const [newTodo, setNewTodo] = useState({
    title: '',
    content: '',
    startDate: '',
    endDate: '',
  });
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loadingTodos, setLoadingTodos] = useState(false);
  const [isSubmittingTodo, setIsSubmittingTodo] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [isAddingSchedule, setIsAddingSchedule] = useState(false);
  const [isSubmittingSchedule, setIsSubmittingSchedule] = useState(false);
  const [loadingSchedules, setLoadingSchedules] = useState(false);
  const [newSchedule, setNewSchedule] = useState<{
    weekSchedules: Array<{
      week: Schedule['week'];
      startTime: number;
      endTime: number;
    }>;
    title: string;
    content: string;
    color: string;
  }>({
    weekSchedules: [],
    title: '',
    content: '',
    color: '#3B82F6',
  });

  // 색상 옵션
  const colorOptions = [
    '#3B82F6', // 파란색
    '#10B981', // 초록색
    '#F59E0B', // 주황색
    '#EF4444', // 빨간색
    '#8B5CF6', // 보라색
    '#EC4899', // 핑크색
    '#06B6D4', // 청록색
    '#84CC16', // 연두색
  ];

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const getMonthName = (date: Date) => {
    return `${date.getFullYear()}년 ${date.getMonth() + 1}월`;
  };

  const isToday = (day: number, date: Date) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const changeMonth = (direction: 'prev' | 'next') => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const todosByDate = useMemo(() => {
    const map: Record<
      string,
      {
        count: number;
        titles: string[];
      }
    > = {};

    todos.forEach((todo) => {
      const start = new Date(todo.startDate);
      const end = new Date(todo.endDate);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return;
      }

      const cursor = new Date(start);
      while (cursor <= end) {
        const key = dateKeyFromParts(
          cursor.getFullYear(),
          cursor.getMonth(),
          cursor.getDate(),
        );
        if (!map[key]) {
          map[key] = { count: 0, titles: [] };
        }
        map[key].count += 1;
        map[key].titles.push(todo.title);
        cursor.setDate(cursor.getDate() + 1);
      }
    });

    return map;
  }, [todos]);

  const tasks = useMemo<Task[]>(() => {
    return todos.map((todo) => ({
      id: todo.todoId.toString(),
      title: todo.title,
      period: formatPeriod(todo.startDate, todo.endDate),
      content: todo.content ?? '내용이 없습니다.',
      dDay: formatDDay(todo.endDate),
    }));
  }, [todos]);

  const isTodoValid = useMemo(() => {
    return (
      newTodo.title.trim() !== '' &&
      newTodo.content.trim() !== '' &&
      newTodo.startDate.trim() !== '' &&
      newTodo.endDate.trim() !== ''
    );
  }, [newTodo]);

  const fetchTodos = useCallback(async () => {
    if (!isLoggedIn || !userId) return;
    try {
      setLoadingTodos(true);
      const response = await fetch(`${API_BASE_URL}/todos`);
      if (!response.ok) {
        throw new Error('할 일 목록을 불러오지 못했습니다.');
      }
      const data = await response.json();
      setTodos(data);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage('할 일을 불러오지 못했습니다. 다시 시도해주세요.');
    } finally {
      setLoadingTodos(false);
    }
  }, [isLoggedIn, userId]);

  const fetchSchedules = useCallback(async () => {
    if (!isLoggedIn || !userId) return;
    try {
      setLoadingSchedules(true);
      const response = await fetch(`${API_BASE_URL}/schedules`);
      if (!response.ok) {
        throw new Error('시간표 목록을 불러오지 못했습니다.');
      }
      const data = await response.json();
      setSchedules(data);
    } catch (error) {
      console.error('시간표 불러오기 실패:', error);
    } finally {
      setLoadingSchedules(false);
    }
  }, [isLoggedIn, userId]);

  useEffect(() => {
    if (isLoggedIn) {
      fetchTodos();
      fetchSchedules();
    }
  }, [isLoggedIn, fetchTodos, fetchSchedules]);

  const handleLogin = async () => {
    if (!loginEmail.trim() || !loginPassword.trim()) {
      Alert.alert('입력 오류', '이메일과 비밀번호를 모두 입력해주세요.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(loginEmail.trim())) {
      Alert.alert('입력 오류', '올바른 이메일 형식을 입력해주세요.');
      return;
    }

    try {
      setIsLoggingIn(true);
      // TODO: 실제 로그인 API 엔드포인트로 변경 필요
      // 임시로 기본 userId를 사용 (백엔드 API가 준비되면 수정)
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: loginEmail.trim(),
          password: loginPassword,
        }),
      });

      if (!response.ok) {
        // API가 없을 경우 임시로 기본 사용자로 로그인 처리
        if (response.status === 404) {
          console.log('로그인 API가 아직 준비되지 않았습니다. 기본 사용자로 로그인합니다.');
          setUserId(DEFAULT_USER_ID);
          setIsLoggedIn(true);
          setActiveTab('과제');
          return;
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || '로그인에 실패했습니다.');
      }

      const data = await response.json();
      const loggedInUserId = data.userId || data.user?.userId || DEFAULT_USER_ID;
      
      setUserId(loggedInUserId);
      setIsLoggedIn(true);
      setActiveTab('과제');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : '로그인 중 오류가 발생했습니다.';
      Alert.alert('로그인 실패', errorMessage);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const formatDateForInput = (date: Date) => {
    const year = date.getFullYear();
    const month = padNumber(date.getMonth() + 1);
    const day = padNumber(date.getDate());
    return `${year}-${month}-${day}`;
  };

  const handleSignUp = async () => {
    // 혹시 열려 있는 생년월일 피커가 있으면 닫기
    setShowSignUpBirthPicker(false);
    if (
      !signUpEmail.trim() ||
      !signUpPassword.trim() ||
      !signUpName.trim() ||
      !signUpBirthDate.trim()
    ) {
      Alert.alert('입력 오류', '모든 필드를 입력해주세요.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(signUpEmail.trim())) {
      Alert.alert('입력 오류', '올바른 이메일 형식을 입력해주세요.');
      return;
    }

    try {
      setIsSigningUp(true);
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: signUpEmail.trim(),
          password: signUpPassword,
          username: signUpName.trim(),
          birthDate: signUpBirthDate.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || '회원가입에 실패했습니다.');
      }

      const data = await response.json();
      const newUserId = data.userId || data.user?.userId || DEFAULT_USER_ID;

      // 회원가입 후 자동 로그인 처리
      setUserId(newUserId);
      setIsLoggedIn(true);
      setActiveTab('과제');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : '회원가입 중 오류가 발생했습니다.';
      Alert.alert('회원가입 실패', errorMessage);
    } finally {
      setIsSigningUp(false);
    }
  };

  const handleToggleTodo = async (todo: Todo) => {
    try {
      const response = await fetch(`${API_BASE_URL}/todos/${todo.todoId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ completed: !todo.completed }),
      });

      if (!response.ok) {
        throw new Error('상태를 업데이트하지 못했습니다.');
      }

      const updated = await response.json();
      setTodos((prev) =>
        prev.map((item) => (item.todoId === updated.todoId ? updated : item)),
      );
    } catch (error) {
      Alert.alert('오류', '할 일 상태를 변경하지 못했습니다.');
    }
  };

  const handleDeleteTodo = async (todoId: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/todos/${todoId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('삭제하지 못했습니다.');
      }

      setTodos((prev) => prev.filter((todo) => todo.todoId !== todoId));
    } catch (error) {
      Alert.alert('오류', '할 일을 삭제하지 못했습니다.');
    }
  };

  const handleChangeNewTodo = (field: keyof typeof newTodo, value: string) => {
    setNewTodo((prev) => ({ ...prev, [field]: value }));
  };

  const resetNewTodo = () => {
    setNewTodo({
      title: '',
      content: '',
      startDate: '',
      endDate: '',
    });
  };

  const handleChangeStartDate = (
    event: DateTimePickerEvent,
    selectedDate?: Date,
  ) => {
    if (event.type === 'set' && selectedDate) {
      setShowStartPicker(false);
      setStartDatePickerDate(selectedDate);
      handleChangeNewTodo('startDate', formatDateForInput(selectedDate));
    } else {
      setShowStartPicker(false);
    }
  };

  const handleChangeEndDate = (
    event: DateTimePickerEvent,
    selectedDate?: Date,
  ) => {
    if (event.type === 'set' && selectedDate) {
      setShowEndPicker(false);
      setEndDatePickerDate(selectedDate);
      handleChangeNewTodo('endDate', formatDateForInput(selectedDate));
    } else {
      setShowEndPicker(false);
    }
  };

  const handleChangeBirthDate = (
    event: DateTimePickerEvent,
    selectedDate?: Date,
  ) => {
    if (event.type === 'set' && selectedDate) {
      setShowSignUpBirthPicker(false);
      setSignUpBirthDatePickerDate(selectedDate);
      setSignUpBirthDate(formatDateForInput(selectedDate));
    } else {
      setShowSignUpBirthPicker(false);
    }
  };

  const handleSaveTodo = async () => {
    if (!isTodoValid || isSubmittingTodo || !userId) {
      return;
    }

    try {
      // 저장 시 날짜 피커 강제로 닫기
      setShowStartPicker(false);
      setShowEndPicker(false);

      setIsSubmittingTodo(true);
      const response = await fetch(`${API_BASE_URL}/todos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userId,
          title: newTodo.title.trim(),
          content: newTodo.content.trim(),
          startDate: newTodo.startDate.trim(),
          endDate: newTodo.endDate.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error('등록에 실패했습니다.');
      }

      const created = await response.json();
      setTodos((prev) => [...prev, created]);
      resetNewTodo();
      setIsAddingTodo(false);
    } catch (error) {
      Alert.alert('오류', '할 일을 저장하지 못했습니다.');
    } finally {
      setIsSubmittingTodo(false);
    }
  };

  const handleCancelTodo = () => {
    resetNewTodo();
    setIsAddingTodo(false);
    // 취소 시 날짜 피커 및 선택 값 초기화
    setShowStartPicker(false);
    setShowEndPicker(false);
    setStartDatePickerDate(null);
    setEndDatePickerDate(null);
  };

  const isScheduleValid = useMemo(() => {
    if (newSchedule.title.trim() === '' || newSchedule.weekSchedules.length === 0) {
      return false;
    }
    return newSchedule.weekSchedules.every(
      (ws) =>
        ws.startTime >= 9 &&
        ws.startTime <= 20 &&
        ws.endTime >= 9 &&
        ws.endTime <= 20 &&
        ws.startTime < ws.endTime,
    );
  }, [newSchedule]);

  const handleChangeNewSchedule = (
    field: 'title' | 'content' | 'color',
    value: string,
  ) => {
    setNewSchedule((prev) => ({ ...prev, [field]: value }));
  };

  const toggleWeek = (week: Schedule['week']) => {
    setNewSchedule((prev) => {
      const existingIndex = prev.weekSchedules.findIndex((ws) => ws.week === week);
      if (existingIndex >= 0) {
        // 이미 있으면 제거
        return {
          ...prev,
          weekSchedules: prev.weekSchedules.filter((ws) => ws.week !== week),
        };
      } else {
        // 없으면 추가 (기본 시간 9-10)
        return {
          ...prev,
          weekSchedules: [...prev.weekSchedules, { week, startTime: 9, endTime: 10 }],
        };
      }
    });
  };

  const updateWeekSchedule = (
    week: Schedule['week'],
    field: 'startTime' | 'endTime',
    value: number,
  ) => {
    setNewSchedule((prev) => ({
      ...prev,
      weekSchedules: prev.weekSchedules.map((ws) =>
        ws.week === week ? { ...ws, [field]: value } : ws,
      ),
    }));
  };

  const resetNewSchedule = () => {
    setNewSchedule({
      weekSchedules: [],
      title: '',
      content: '',
      color: '#3B82F6',
    });
  };

  const handleSaveSchedule = async () => {
    if (!isScheduleValid || isSubmittingSchedule || !userId) {
      return;
    }

    try {
      setIsSubmittingSchedule(true);
      const createdSchedules: Schedule[] = [];

      // 선택된 모든 요일에 대해 각각의 시간으로 시간표 생성
      for (const weekSchedule of newSchedule.weekSchedules) {
        const response = await fetch(`${API_BASE_URL}/schedules`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: userId,
            week: weekSchedule.week,
            startTime: weekSchedule.startTime,
            endTime: weekSchedule.endTime,
            title: newSchedule.title.trim(),
            content: newSchedule.content.trim() || null,
            color: newSchedule.color,
          }),
        });

        if (!response.ok) {
          throw new Error('등록에 실패했습니다.');
        }

        const created = await response.json();
        createdSchedules.push(created);
      }

      setSchedules((prev) => [...prev, ...createdSchedules]);
      resetNewSchedule();
      setIsAddingSchedule(false);
    } catch (error) {
      Alert.alert('오류', '시간표를 저장하지 못했습니다.');
    } finally {
      setIsSubmittingSchedule(false);
    }
  };

  const handleCancelSchedule = () => {
    resetNewSchedule();
    setIsAddingSchedule(false);
  };

  const handleDeleteSchedule = async (scheduleId: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/schedules/${scheduleId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('삭제하지 못했습니다.');
      }

      setSchedules((prev) =>
        prev.filter((schedule) => schedule.scheduleId !== scheduleId),
      );
    } catch (error) {
      Alert.alert('오류', '시간표를 삭제하지 못했습니다.');
    }
  };

  const renderTaskList = () => (
    <ScrollView style={styles.contentContainer}>
      <Text style={styles.sectionTitle}>진행 중인 과제</Text>
      {tasks.length === 0 && (
        <Text style={styles.emptyStateText}>
          아직 등록된 과제가 없습니다. 할 일 탭에서 새로 추가해보세요.
        </Text>
      )}
      {tasks.map((task) => (
        <View key={task.id} style={styles.taskCard}>
          <View style={styles.taskHeader}>
            <Text style={styles.taskTitle}>{task.title}</Text>
            <View style={styles.dDayBadge}>
              <Text style={styles.dDayText}>{task.dDay}</Text>
            </View>
          </View>
          <Text style={styles.taskPeriod}>{task.period}</Text>
          <Text style={styles.taskContent}>{task.content}</Text>
        </View>
      ))}
    </ScrollView>
  );

  const renderTodoList = () => (
    <ScrollView style={styles.contentContainer}>
      <Text style={styles.sectionTitle}>오늘의 할 일</Text>

      {errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}
      {loadingTodos && (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="small" color="#333" />
          <Text style={styles.loadingText}>불러오는 중...</Text>
        </View>
      )}

      {!loadingTodos && (
        <>
          {!isAddingTodo ? (
            <TouchableOpacity
              style={styles.addTodoTrigger}
              onPress={() => setIsAddingTodo(true)}
            >
              <Text style={styles.addTodoTriggerText}>추가</Text>
              <Text style={styles.addTodoTriggerSub}>
                제목 · 내용 · 시작/종료 날짜를 입력하세요
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.todoForm}>
              <Text style={styles.todoFormTitle}>새 할 일 등록</Text>
              <TextInput
                style={styles.todoFormInput}
                placeholder="제목"
                value={newTodo.title}
                onChangeText={(text) => handleChangeNewTodo('title', text)}
              />
              <TextInput
                style={[styles.todoFormInput, styles.todoFormTextarea]}
                placeholder="내용"
                value={newTodo.content}
                multiline
                onChangeText={(text) => handleChangeNewTodo('content', text)}
              />
              <View style={styles.todoFormDateRow}>
                <TouchableOpacity
                  style={[styles.todoFormInput, styles.todoFormDateInput]}
                  onPress={() => {
                    setShowStartPicker(true);
                    setStartDatePickerDate(
                      startDatePickerDate ?? new Date(),
                    );
                  }}
                >
                  <Text style={styles.dateText}>
                    {newTodo.startDate || '시작 날짜 선택 (YYYY-MM-DD)'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.todoFormInput, styles.todoFormDateInput]}
                  onPress={() => {
                    setShowEndPicker(true);
                    setEndDatePickerDate(endDatePickerDate ?? new Date());
                  }}
                >
                  <Text style={styles.dateText}>
                    {newTodo.endDate || '종료 날짜 선택 (YYYY-MM-DD)'}
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={styles.todoFormActions}>
                <TouchableOpacity
                  style={[
                    styles.saveButton,
                    (!isTodoValid || isSubmittingTodo) && styles.disabledButton,
                  ]}
                  onPress={handleSaveTodo}
                  disabled={!isTodoValid || isSubmittingTodo}
                >
                  <Text style={styles.saveButtonText}>
                    {isSubmittingTodo ? '저장 중...' : '저장'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={handleCancelTodo}
                >
                  <Text style={styles.cancelButtonText}>취소</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <View style={styles.todoList}>
            {todos.length === 0 && (
              <Text style={styles.emptyStateText}>
                등록된 할 일이 없습니다. 위 버튼으로 추가해보세요.
              </Text>
            )}
            {todos.map((todo) => (
              <View key={todo.todoId} style={styles.todoItem}>
                <TouchableOpacity
                  style={styles.checkbox}
                  onPress={() => handleToggleTodo(todo)}
                >
                  {todo.completed && <View style={styles.checkboxChecked} />}
                </TouchableOpacity>
                <View style={styles.todoContent}>
                  <Text style={styles.todoTitle}>{todo.title}</Text>
                  <Text style={styles.todoDescription}>
                    {todo.content || '내용이 없습니다.'}
                  </Text>
                  <Text style={styles.todoDate}>
                    {formatPeriod(todo.startDate, todo.endDate)}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeleteTodo(todo.todoId)}
                >
                  <Text style={styles.deleteButtonText}>삭제</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];

    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }

    const remainingDays = days.length % 7;
    if (remainingDays !== 0) {
      for (let i = 0; i < 7 - remainingDays; i++) {
        days.push(null);
      }
    }

    const weeks = [];
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7));
    }

    return (
      <ScrollView style={styles.contentContainer}>
        <View style={styles.calendarContainer}>
          <View style={styles.calendarMonthHeader}>
            <TouchableOpacity
              style={styles.monthButton}
              onPress={() => changeMonth('prev')}
            >
              <Text style={styles.monthButtonText}>‹</Text>
            </TouchableOpacity>
            <Text style={styles.monthTitle}>{getMonthName(currentDate)}</Text>
            <TouchableOpacity
              style={styles.monthButton}
              onPress={() => changeMonth('next')}
            >
              <Text style={styles.monthButtonText}>›</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.calendarHeader}>
            {['일', '월', '화', '수', '목', '금', '토'].map((day, index) => (
              <Text
                key={index}
                style={[
                  styles.calendarDay,
                  index === 0 && styles.sundayText,
                  index === 6 && styles.saturdayText,
                ]}
              >
                {day}
              </Text>
            ))}
          </View>

          <View style={styles.calendarGrid}>
            {weeks.map((week, weekIndex) => (
              <View key={weekIndex} style={styles.calendarRow}>
                {week.map((day, dayIndex) => {
                  if (day === null) {
                    return (
                      <View
                        key={`${weekIndex}-${dayIndex}`}
                        style={styles.calendarCell}
                      />
                    );
                  }

                  const dateKey = dateKeyFromParts(
                    currentDate.getFullYear(),
                    currentDate.getMonth(),
                    day,
                  );
                  const todoInfo = todosByDate[dateKey];

                  return (
                    <View
                      key={`${weekIndex}-${dayIndex}`}
                      style={[
                        styles.calendarCell,
                        isToday(day, currentDate) && styles.todayCell,
                        todoInfo && styles.calendarCellHighlight,
                      ]}
                    >
                      <Text
                        style={[
                          styles.calendarDateText,
                          isToday(day, currentDate) && styles.todayText,
                          dayIndex === 0 && styles.sundayText,
                          dayIndex === 6 && styles.saturdayText,
                        ]}
                      >
                        {day}
                      </Text>
                      {todoInfo && (
                        <View style={styles.calendarTodoIndicator}>
                          <View style={styles.calendarTodoDot} />
                          <Text style={styles.calendarTodoCount}>
                            {todoInfo.count}건
                          </Text>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    );
  };

  const renderTimeTable = () => {
    const weekDays: Schedule['week'][] = [
      'Mon',
      'Tue',
      'Wen',
      'Thu',
      'Fri',
      'Sat',
      'Sun',
    ];
    const weekDayLabels = ['월', '화', '수', '목', '금', '토', '일'];
    const hours = Array.from({ length: 12 }, (_, i) => i + 9);

    const getScheduleForCell = (hour: number, day: Schedule['week']) => {
      return schedules.find(
        (s) => s.week === day && s.startTime <= hour && s.endTime > hour,
      );
    };

    return (
      <ScrollView style={styles.contentContainer}>
        <Text style={styles.sectionTitle}>시간표</Text>

        {loadingSchedules && (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="small" color="#333" />
            <Text style={styles.loadingText}>불러오는 중...</Text>
          </View>
        )}

        {!loadingSchedules && (
          <>
            {!isAddingSchedule ? (
              <TouchableOpacity
                style={styles.addTodoTrigger}
                onPress={() => setIsAddingSchedule(true)}
              >
                <Text style={styles.addTodoTriggerText}>시간표 추가</Text>
                <Text style={styles.addTodoTriggerSub}>
                  요일 · 시간 · 제목을 입력하세요
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.todoForm}>
                <Text style={styles.todoFormTitle}>새 시간표 등록</Text>
                <TextInput
                  style={styles.todoFormInput}
                  placeholder="제목"
                  value={newSchedule.title}
                  onChangeText={(text) =>
                    handleChangeNewSchedule('title', text)
                  }
                />
                <TextInput
                  style={[styles.todoFormInput, styles.todoFormTextarea]}
                  placeholder="내용 (선택사항)"
                  value={newSchedule.content}
                  multiline
                  onChangeText={(text) =>
                    handleChangeNewSchedule('content', text)
                  }
                />
                <View style={styles.todoFormDateRow}>
                  <View style={[styles.todoFormInput, { flex: 1 }]}>
                    <Text style={styles.label}>요일 선택</Text>
                    <View style={styles.weekDaySelector}>
                      {weekDays.map((day, index) => {
                        const isSelected = newSchedule.weekSchedules.some(
                          (ws) => ws.week === day,
                        );
                        return (
                          <TouchableOpacity
                            key={day}
                            style={[
                              styles.weekDayButton,
                              isSelected && styles.weekDayButtonActive,
                            ]}
                            onPress={() => toggleWeek(day)}
                          >
                            <Text
                              style={[
                                styles.weekDayButtonText,
                                isSelected && styles.weekDayButtonTextActive,
                              ]}
                            >
                              {weekDayLabels[index]}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                </View>

                {newSchedule.weekSchedules.length > 0 && (
                  <View style={styles.todoFormInput}>
                    <Text style={styles.label}>요일별 시간 설정</Text>
                    {newSchedule.weekSchedules.map((weekSchedule, index) => {
                      const dayIndex = weekDays.findIndex(
                        (d) => d === weekSchedule.week,
                      );
                      return (
                        <View key={weekSchedule.week} style={styles.weekScheduleItem}>
                          <View style={styles.weekScheduleHeader}>
                            <Text style={styles.weekScheduleDayLabel}>
                              {weekDayLabels[dayIndex]}
                            </Text>
                            <TouchableOpacity
                              style={styles.removeWeekButton}
                              onPress={() => toggleWeek(weekSchedule.week)}
                            >
                              <Text style={styles.removeWeekButtonText}>×</Text>
                            </TouchableOpacity>
                          </View>
                          <View style={styles.weekScheduleTimeRow}>
                            <View style={styles.weekScheduleTimeGroup}>
                              <Text style={styles.weekScheduleTimeLabel}>
                                시작
                              </Text>
                              <View style={styles.timeSelector}>
                                {hours.map((hour) => (
                                  <TouchableOpacity
                                    key={hour}
                                    style={[
                                      styles.timeButton,
                                      weekSchedule.startTime === hour &&
                                        styles.timeButtonActive,
                                    ]}
                                    onPress={() =>
                                      updateWeekSchedule(
                                        weekSchedule.week,
                                        'startTime',
                                        hour,
                                      )
                                    }
                                  >
                                    <Text
                                      style={[
                                        styles.timeButtonText,
                                        weekSchedule.startTime === hour &&
                                          styles.timeButtonTextActive,
                                      ]}
                                    >
                                      {hour}시
                                    </Text>
                                  </TouchableOpacity>
                                ))}
                              </View>
                            </View>
                            <View style={styles.weekScheduleTimeGroup}>
                              <Text style={styles.weekScheduleTimeLabel}>
                                종료
                              </Text>
                              <View style={styles.timeSelector}>
                                {hours.map((hour) => (
                                  <TouchableOpacity
                                    key={hour}
                                    style={[
                                      styles.timeButton,
                                      weekSchedule.endTime === hour &&
                                        styles.timeButtonActive,
                                    ]}
                                    onPress={() =>
                                      updateWeekSchedule(
                                        weekSchedule.week,
                                        'endTime',
                                        hour,
                                      )
                                    }
                                  >
                                    <Text
                                      style={[
                                        styles.timeButtonText,
                                        weekSchedule.endTime === hour &&
                                          styles.timeButtonTextActive,
                                      ]}
                                    >
                                      {hour}시
                                    </Text>
                                  </TouchableOpacity>
                                ))}
                              </View>
                            </View>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}

                <View style={[styles.todoFormInput]}>
                  <Text style={styles.label}>색상 선택</Text>
                  <View style={styles.colorSelector}>
                    {colorOptions.map((color) => (
                      <TouchableOpacity
                        key={color}
                        style={[
                          styles.colorButton,
                          {
                            backgroundColor: color,
                            borderWidth: newSchedule.color === color ? 3 : 1,
                            borderColor:
                              newSchedule.color === color ? '#333' : '#ddd',
                          },
                        ]}
                        onPress={() =>
                          handleChangeNewSchedule('color', color)
                        }
                      >
                        {newSchedule.color === color && (
                          <Text style={styles.colorCheckmark}>✓</Text>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                <View style={styles.todoFormActions}>
                  <TouchableOpacity
                    style={[
                      styles.saveButton,
                      (!isScheduleValid || isSubmittingSchedule) &&
                        styles.disabledButton,
                    ]}
                    onPress={handleSaveSchedule}
                    disabled={!isScheduleValid || isSubmittingSchedule}
                  >
                    <Text style={styles.saveButtonText}>
                      {isSubmittingSchedule ? '저장 중...' : '저장'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={handleCancelSchedule}
                  >
                    <Text style={styles.cancelButtonText}>취소</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <View style={styles.timeTableContainer}>
              <View style={styles.timeTableHeader}>
                <View style={styles.timeTableTimeColumn}>
                  <Text style={styles.timeTableTimeLabel}>시간</Text>
                </View>
                {weekDayLabels.map((day, index) => (
                  <View key={weekDays[index]} style={styles.timeTableDayColumn}>
                    <Text style={styles.timeTableDayLabel}>{day}</Text>
                  </View>
                ))}
              </View>
              <View style={styles.timeTableGrid}>
                {hours.map((hour) => (
                  <View key={hour} style={styles.timeTableRow}>
                    <View style={styles.timeTableTimeColumn}>
                      <Text style={styles.timeTableTimeText}>{hour}시</Text>
                    </View>
                    {weekDays.map((day) => {
                      const schedule = getScheduleForCell(hour, day);
                      const isStart = schedule?.startTime === hour;
                      return (
                        <View
                          key={day}
                          style={[
                            styles.timeTableCell,
                            schedule && styles.timeTableCellWithSchedule,
                          ]}
                        >
                          {isStart && schedule && (
                            <View
                              style={[
                                styles.scheduleBlock,
                                {
                                  backgroundColor: schedule.color,
                                  height: `${
                                    (schedule.endTime - schedule.startTime) *
                                    100
                                  }%`,
                                },
                              ]}
                            >
                              <Text
                                style={styles.scheduleBlockTitle}
                                numberOfLines={1}
                              >
                                {schedule.title}
                              </Text>
                              <TouchableOpacity
                                style={styles.scheduleDeleteButton}
                                onPress={() =>
                                  handleDeleteSchedule(schedule.scheduleId)
                                }
                              >
                                <Text style={styles.scheduleDeleteButtonText}>
                                  ×
                                </Text>
                              </TouchableOpacity>
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </View>
                ))}
              </View>
            </View>
          </>
        )}
      </ScrollView>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case '과제':
        return renderTaskList();
      case '할 일':
        return renderTodoList();
      case '달력':
        return renderCalendar();
      case '시간표':
        return renderTimeTable();
      default:
        return renderTaskList();
    }
  };

  const renderLoginPage = () => (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.loginContent}>
          <View style={styles.loginHeader}>
            <Text style={styles.loginTitle}>일정 관리 앱</Text>
            <Text style={styles.loginSubtitle}>
              {isSignUpMode ? '회원가입 정보를 입력하세요' : '로그인하여 시작하세요'}
            </Text>
          </View>

          <View style={styles.loginForm}>
            {!isSignUpMode ? (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>이메일</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="이메일을 입력하세요"
                    placeholderTextColor="#999"
                    value={loginEmail}
                    onChangeText={setLoginEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!isLoggingIn}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>비밀번호</Text>
                  <View style={styles.passwordContainer}>
                    <TextInput
                      style={styles.passwordInput}
                      placeholder="비밀번호를 입력하세요"
                      placeholderTextColor="#999"
                      value={loginPassword}
                      onChangeText={setLoginPassword}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!isLoggingIn}
                    />
                    <TouchableOpacity
                      style={styles.eyeButton}
                      onPress={() => setShowPassword(!showPassword)}
                      disabled={isLoggingIn}
                    >
                      <Text style={styles.eyeButtonText}>
                        {showPassword ? '숨기기' : '보기'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.loginButton, isLoggingIn && styles.disabledButton]}
                  onPress={handleLogin}
                  disabled={isLoggingIn}
                >
                  {isLoggingIn ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.loginButtonText}>로그인</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>이메일 (아이디)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="이메일을 입력하세요"
                    placeholderTextColor="#999"
                    value={signUpEmail}
                    onChangeText={setSignUpEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!isSigningUp}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>비밀번호</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="비밀번호를 입력하세요"
                    placeholderTextColor="#999"
                    value={signUpPassword}
                    onChangeText={setSignUpPassword}
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!isSigningUp}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>이름</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="이름을 입력하세요"
                    placeholderTextColor="#999"
                    value={signUpName}
                    onChangeText={setSignUpName}
                    editable={!isSigningUp}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>생년월일</Text>
                  <TouchableOpacity
                    style={styles.input}
                    onPress={() => {
                      setShowSignUpBirthPicker(true);
                      setSignUpBirthDatePickerDate(
                        signUpBirthDatePickerDate ?? new Date(),
                      );
                    }}
                    disabled={isSigningUp}
                  >
                    <Text style={styles.dateText}>
                      {signUpBirthDate || 'YYYY-MM-DD 형식으로 선택하세요'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[styles.loginButton, isSigningUp && styles.disabledButton]}
                  onPress={handleSignUp}
                  disabled={isSigningUp}
                >
                  {isSigningUp ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.loginButtonText}>회원가입</Text>
                  )}
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity
              style={styles.switchModeButton}
              onPress={() => setIsSignUpMode((prev) => !prev)}
              disabled={isLoggingIn || isSigningUp}
            >
              <Text style={styles.switchModeText}>
                {isSignUpMode
                  ? '이미 계정이 있으신가요? 로그인하기'
                  : '아직 계정이 없으신가요? 회원가입'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );

  if (!isLoggedIn) {
    return (
      <>
        {renderLoginPage()}
        {showSignUpBirthPicker && (
          <DateTimePicker
            value={signUpBirthDatePickerDate ?? new Date()}
            mode="date"
            display={Platform.OS === 'ios' ? 'inline' : 'spinner'}
            onChange={handleChangeBirthDate}
            maximumDate={new Date()}
          />
        )}
      </>
    );
  }

  return (
    <>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>일정 관리 앱</Text>
        </View>

        {renderContent()}

        <View style={styles.tabBar}>
          {(['과제', '할 일', '달력', '시간표'] as TabType[]).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.activeTab]}
              onPress={() => setActiveTab(tab)}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab && styles.activeTabText,
                ]}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </SafeAreaView>

      {showStartPicker && (
        <DateTimePicker
          value={startDatePickerDate ?? new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'spinner'}
          onChange={handleChangeStartDate}
        />
      )}
      {showEndPicker && (
        <DateTimePicker
          value={endDatePickerDate ?? new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'spinner'}
          onChange={handleChangeEndDate}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  keyboardView: {
    flex: 1,
  },
  loginContent: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  loginHeader: {
    alignItems: 'center',
    marginBottom: 48,
  },
  loginTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  loginSubtitle: {
    fontSize: 16,
    color: '#666',
  },
  loginForm: {
    width: '100%',
  },
  switchModeButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  switchModeText: {
    fontSize: 14,
    color: '#007AFF',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
    color: '#333',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  eyeButton: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  eyeButtonText: {
    fontSize: 14,
    color: '#666',
  },
  loginButton: {
    backgroundColor: '#4caf50',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  header: {
    padding: 20,
    backgroundColor: '#f5f5f5',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  contentContainer: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  taskCard: {
    backgroundColor: '#e8e8e8',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  dDayBadge: {
    backgroundColor: '#999',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
  },
  dDayText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  taskPeriod: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  taskContent: {
    fontSize: 14,
    color: '#666',
  },
  todoList: {
    gap: 12,
  },
  todoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#999',
    borderRadius: 4,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    width: 14,
    height: 14,
    backgroundColor: '#333',
    borderRadius: 2,
  },
  deleteButton: {
    backgroundColor: '#ff4444',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  deleteButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  addTodoTrigger: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 16,
    backgroundColor: '#fafafa',
    marginBottom: 16,
  },
  addTodoTriggerText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  addTodoTriggerSub: {
    fontSize: 13,
    color: '#777',
  },
  todoForm: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 16,
    backgroundColor: '#fff',
    marginBottom: 20,
    gap: 12,
  },
  todoFormTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  todoFormInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#f9f9f9',
  },
  todoFormTextarea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  todoFormDateRow: {
    flexDirection: 'row',
    gap: 12,
  },
  todoFormDateInput: {
    flex: 1,
  },
  dateText: {
    fontSize: 14,
    color: '#333',
  },
  todoFormActions: {
    flexDirection: 'row',
    gap: 12,
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#4caf50',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  disabledButton: {
    backgroundColor: '#a5d6a7',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#eee',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#555',
    fontWeight: '600',
  },
  todoContent: {
    flex: 1,
  },
  todoTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  todoDescription: {
    fontSize: 14,
    color: '#555',
    marginBottom: 4,
  },
  todoDate: {
    fontSize: 13,
    color: '#777',
  },
  emptyStateText: {
    fontSize: 14,
    color: '#888',
    marginBottom: 16,
    textAlign: 'center',
  },
  errorText: {
    color: '#d32f2f',
    marginBottom: 12,
    textAlign: 'center',
  },
  loadingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  loadingText: {
    color: '#555',
  },
  calendarContainer: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 8,
  },
  calendarMonthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginBottom: 8,
  },
  monthButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 20,
  },
  monthButtonText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  calendarHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    paddingBottom: 8,
    marginBottom: 8,
  },
  calendarDay: {
    flex: 1,
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 14,
    color: '#333',
  },
  sundayText: {
    color: '#ff4444',
  },
  saturdayText: {
    color: '#4444ff',
  },
  calendarGrid: {
    gap: 1,
  },
  calendarRow: {
    flexDirection: 'row',
    height: 50,
    alignItems: 'center',
  },
  calendarDate: {
    width: 30,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
  },
  calendarDateText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  calendarCell: {
    flex: 1,
    height: '100%',
    backgroundColor: '#fff',
    borderWidth: 0.5,
    borderColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarCellHighlight: {
    borderColor: '#2196f3',
    borderWidth: 2,
  },
  todayCell: {
    backgroundColor: '#e3f2fd',
    borderColor: '#2196f3',
    borderWidth: 2,
  },
  todayText: {
    color: '#2196f3',
    fontWeight: 'bold',
  },
  calendarTodoIndicator: {
    marginTop: 4,
    alignItems: 'center',
    gap: 2,
  },
  calendarTodoDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2196f3',
  },
  calendarTodoCount: {
    fontSize: 10,
    color: '#2196f3',
    fontWeight: '600',
  },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  activeTab: {
    backgroundColor: '#fff',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
  },
  activeTabText: {
    color: '#000',
    fontWeight: 'bold',
  },
  timeTableContainer: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 8,
    marginTop: 16,
  },
  timeTableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    paddingBottom: 8,
    marginBottom: 8,
  },
  timeTableTimeColumn: {
    width: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeTableDayColumn: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeTableTimeLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
  },
  timeTableDayLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
  },
  timeTableGrid: {
    gap: 1,
  },
  timeTableRow: {
    flexDirection: 'row',
    minHeight: 40,
    alignItems: 'stretch',
  },
  timeTableTimeText: {
    fontSize: 11,
    color: '#666',
    fontWeight: '500',
  },
  timeTableCell: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 0.5,
    borderColor: '#ddd',
    position: 'relative',
    minHeight: 40,
  },
  timeTableCellWithSchedule: {
    borderColor: '#2196f3',
  },
  scheduleBlock: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    padding: 4,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  scheduleBlockTitle: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  scheduleDeleteButton: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scheduleDeleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    lineHeight: 16,
  },
  weekDaySelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 8,
  },
  weekDayButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  weekDayButtonActive: {
    backgroundColor: '#4caf50',
    borderColor: '#4caf50',
  },
  weekDayButtonText: {
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
  },
  weekDayButtonTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  timeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 8,
  },
  timeButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  timeButtonActive: {
    backgroundColor: '#2196f3',
    borderColor: '#2196f3',
  },
  timeButtonText: {
    fontSize: 11,
    color: '#333',
    fontWeight: '500',
  },
  timeButtonTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  colorSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  colorButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  colorCheckmark: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  weekScheduleItem: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  weekScheduleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  weekScheduleDayLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  removeWeekButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ff4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeWeekButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    lineHeight: 18,
  },
  weekScheduleTimeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  weekScheduleTimeGroup: {
    flex: 1,
  },
  weekScheduleTimeLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    fontWeight: '500',
  },
});

