import { useLocation, useNavigate } from 'react-router-dom';
import './SignPage.css';
import { useEffect, useRef, useState } from 'react';
import axios from 'axios';

enum Mode {
    로그인 = 'sign_in',
    회원가입 = 'sign_up', 
}

export default function SignPage() {

    const {m} = useLocation().state ?? {m: 'sign_in'};
    const navigate = useNavigate();

    const [mode,setMode] = useState<Mode>(m ?? Mode.로그인);

    const refForm      = useRef<HTMLDivElement>(null);
    const refIdInput   = useRef<HTMLInputElement>(null);
    const refPwInput   = useRef<HTMLInputElement>(null);
    const refRePwInput = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if(refIdInput.current) {
            refIdInput.current.focus();
        }
    },[refIdInput]);

    useEffect(() => {
        Animation.intro(refForm.current)
    },[mode]);
    
    const Animation = {
        outro(el: HTMLElement | undefined | null, onDone?: () => void) {
            
            if(!el) {
                return;
            }

            const DURATION = 300;

            for(let child of [...el.children]) {
                child.animate([
                    { opacity: 1, marginLeft: '0px'},
                    { opacity: 0, marginLeft: '-15px'},
                ], {
                    duration: DURATION,
                    easing: 'ease',
                    fill: 'forwards'
                })
            }

            setTimeout(() => {
                onDone?.();
            }, DURATION)
        },

        intro(el: HTMLElement | undefined | null, onDone?: () => void) {

            if(!el) {
                return;
            }

            const DURATION = 300;
            
            for(let child of [...el.children]) {
                child.animate([
                    { opacity: 0, marginLeft: '15px'},
                    { opacity: 1, marginLeft: '0px'},
                ], {
                    duration: DURATION,
                    easing: 'ease',
                    fill: 'forwards'
                })
            }

            setTimeout(() => {
                onDone?.();
            }, DURATION)
        }
    }

    function setError(message: string | undefined) {
        const el = document.querySelector(`#error`)
        
        if(el) {
            if(message) {
                (el as HTMLElement).style.display = 'block';
                el.innerHTML = message;
            } else {
                (el as HTMLElement).style.display = 'none';
                el.innerHTML = '';
            }
        }
    }

    function Error() {
        return (
            <div id="error" />
        )
    }

    /**
     * 입력 항목 컴포넌트 모음
     */
    const Input = {

        /** 
          * 아이디 입력 항목
          */
        ID() {
            return (
                <div>
                    <div>아이디</div>
                    <input 
                        type     = "text" 
                        ref      = {refIdInput}
                        onChange = {() => InputError.setIdError(undefined)}
                    />
                    <div className="err_message" />
                </div>
            )
        },

        /** 
         * 비밀번호 입력 항목
         */
        Password() {
            return (
                <div>
                    <div>비밀번호</div>
                    <input 
                        type     = "password" 
                        ref      = {refPwInput}
                        onChange = {() => InputError.setPwError(undefined)}
                    />
                    <div className="err_message" />
                </div>
            )
        },
        /**
         * 비밀번호 재입력 항목
         */
        RePassword() {
            return (
                <div>
                    <div>비밀번호 재입력</div>
                    <input 
                        type     = "password" 
                        ref      = {refRePwInput}
                        onChange = {() => InputError.setRePwError(undefined)}
                    />
                    <div className="err_message" />
                </div>
            )
        }
    }

    /**
     * 입력 오류 검사 및 메세지 설정 관련 메소드 모음
     */
    const InputError = {
        /** 
         * 입력한 문자열의 아이디 조건 만족 여부를 반환하고
         * 오류가 있을 경우 출력합니다.
         */
        checkId() {
            const idInput = refIdInput.current;

            if(!idInput) {
                return false;
            }

            if(!idInput.value || idInput.value.length === 0) {
                InputError.setIdError("아이디를 입력해주세요.")
                return false;
            }

            const just_err = () => InputError.setIdError("아이디 또는 비밀번호가 올바르지 않아요.");

            // 아이디는 4자 이상, 20자 이하여야 함
            if(idInput.value.length < 4 || idInput.value.length > 20) {
                if(mode === Mode.로그인)  {
                    just_err();
                } else {
                    InputError.setIdError("아이디는 최소 4자 이상, 20자 이하여야 해요.")
                }
                return;
            }

            console.log(idInput.value);

            // 허용되지 않은 문자가 있음
            if(!/^[a-zA-Z0-9_.]*$/.test(idInput.value)) {
                if(mode === Mode.로그인)  {
                    just_err();
                } else {
                    InputError.setIdError("아이디에는 영문, 숫자, ., _만 사용할 수 있어요.")
                }
                return;
            }

            return true;
        },

        /** 
         * 입력한 문자열의 비밀번호 조건 만족 여부를 반환하고
         * 오류가 있을 경우 출력합니다.
         */
        checkPassword() {
            const pwInput = refPwInput.current;

            if(!pwInput) {
                return false;
            }

            if(!pwInput.value || pwInput.value.length === 0) {
                InputError.setPwError("비밀번호를 입력해주세요.");
                return false;
            }

            const just_err = () => InputError.setIdError("아이디 또는 비밀번호가 올바르지 않아요.");

            // 아이디는 6자 이상, 20자 이하여야 함
            if(pwInput.value.length < 6 || pwInput.value.length > 30) {
                if(mode === Mode.로그인)  {
                    just_err();
                } else {
                    InputError.setIdError("비밀번호는 최소 6자 이상, 30자 이하여야 해요.")
                }
                return;
            }

            // 회원가입일 경우 비밀번호 재입력 확인
            if(mode === Mode.회원가입) {
                if(pwInput.value !== refRePwInput.current?.value ?? "") {
                    InputError.setRePwError("비밀번호가 일치하지 않아요.")
                    return false;
                }
            }

            // 허용되지 않은 문자가 있음
            if(!/^[a-zA-Z0-9_.!]*$/.test(pwInput.value)) {
                if(mode === Mode.로그인)  {
                    just_err();
                } else {
                    InputError.setPwError("비밀번호에는 영문, 숫자, ._!만 사용할 수 있어요.")
                }
                return;
            }

            return true;
        },

        /**
         * 입력한 아이디, 비밀번호가 제출하기에 올바른 조건인지 여부를 반환하고
         * 오류가 있을 경우 출력합니다.
         * 
         * @return 최종적으로 제출에 문제가 없을 경우 true, 그렇지 않을 경우 false
         */
        checkAll() {
            return (
                InputError.checkId() &&
                InputError.checkPassword()
            )
        },

        setIdError(message: string | undefined) {
            const idInputEl     = refIdInput.current;
            const targetElement = idInputEl?.parentElement;
            const messageEl     = targetElement?.querySelector('.err_message');

            if(!targetElement || !messageEl) {
                return;
            }
            if(!message) {
                targetElement.setAttribute('data-error','');
                return;
            }

            targetElement.setAttribute('data-error','true');
            messageEl.innerHTML = message;
        },

        setPwError(message: string | undefined) {
            const pwInputEl     = refPwInput.current;
            const targetElement = pwInputEl?.parentElement;
            const messageEl     = targetElement?.querySelector('.err_message');

            if(!targetElement || !messageEl) {
                return;
            }

            if(!message) {
                targetElement.setAttribute('data-error','');
                return;
            }

            targetElement.setAttribute('data-error','true');
            messageEl.innerHTML = message;
        },

        setRePwError(message: string | undefined) {
            const rePwInputEl   = refRePwInput.current;
            const targetElement = rePwInputEl?.parentElement;
            const messageEl     = targetElement?.querySelector('.err_message');

            if(!targetElement || !messageEl) {
                return;
            }

            if(!message) {
                targetElement.setAttribute('data-error','');
                return;
            }

            targetElement.setAttribute('data-error','true');
            messageEl.innerHTML = message;
        }
    }

    async function submit() {
        if(!InputError.checkAll()) {
            console.log("check input 실패")
            return;
        }

        try {

            switch(mode) {
                case Mode.회원가입:

                    const signUpRs = (
                        await axios.post("/user/register", {
                            id: refIdInput.current!.value,
                            pw: refPwInput.current!.value
                        }) 
                    ).data;
        
                    if(signUpRs.success) {  
                        navigate("/note-list");
                    } else {
                        InputError.setIdError(signUpRs.error);
                    }

                    break;

                case Mode.로그인:

                    const signInRs = (
                        await axios.post("/user/login", {
                            id: refIdInput.current!.value,
                            pw: refPwInput.current!.value
                        })
                    ).data;
        
                    if(signInRs.success) {  
                        navigate("/note-list");
                    } else {
                        InputError.setIdError(signInRs.error);
                    }

                    break;
            }

        } catch (e) {
            console.error(e);
            setError("서버와의 연결에 실패했어요. 아무래도 저희쪽 문제같네요.")
        }
    }

    function SignIn() {

        function onClick_SignUpButton() {
            Animation.outro(refForm.current, () => setMode(Mode.회원가입));
        }

        return (
            <>
                <div className="title">로그인</div>

                <Error />

                <div className="input">
                    <Input.ID />
                    <Input.Password />
                </div>

                <div className="submit">
                    <button onClick={submit}>로그인</button>
                </div>

                <nav>
                    <div onClick={onClick_SignUpButton}>아직 계정이 없으신가요?</div>
                </nav>
            </>
        )
    }

    function SignUp() {
        
        function onClick_SignInButton() {
            Animation.outro(refForm.current, () => setMode(Mode.로그인));
        }

        return (
            <>
                <div className="title">회원가입</div>

                <Error />

                <div className="input">
                    <Input.ID />
                    <Input.Password />
                    <Input.RePassword />
                </div>

                <div className="submit">
                    <button onClick={submit}>회원가입</button>
                </div>

                <nav>
                    <div onClick={onClick_SignInButton}>이미 계정이 있으신가요?</div>
                </nav>
            </>
        )
    }

    return (
        <div className="sign-page">
            <div className="form" ref={refForm}>
                {
                    mode === Mode.로그인 &&
                    <SignIn />
                }
                {
                    mode === Mode.회원가입 &&
                    <SignUp />
                }
            </div>
        </div>
    )
}